import "server-only";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import { getMediaFor } from "./media";
import { PAGE_SIZE, type DiscoverFilters } from "@/lib/discover-params";
import { intentTags, parseTextIntent } from "@/lib/recommendation/intent";
import type { Recipe, RecipeDetail, RecipeLayerWithGlaze, RecipeSource, RecipeSummary } from "@/types/domain";

export const GLAZE_JOIN = "*, brand:brands(id,name,slug), series:glaze_series(id,name,slug)";
export const RECIPE_SELECT = `*, layers:recipe_layers(*, glaze:glazes(${GLAZE_JOIN}))`;

type RecipeRow = Recipe & { layers: RecipeLayerWithGlaze[] | null };

function normalize(row: RecipeRow): Omit<RecipeSummary, "primary_image"> {
  return {
    ...row,
    layers: [...(row.layers ?? [])].sort((a, b) => a.layer_position - b.layer_position),
  };
}

/** Rows -> RecipeSummary with primary images resolved in one media query. */
export async function hydrateSummaries(supabase: ServerSupabase, rows: RecipeRow[]): Promise<RecipeSummary[]> {
  const media = await getMediaFor(supabase, "recipe", rows.map((r) => r.id));
  return rows.map((row) => {
    const list = media.get(row.id) ?? [];
    return { ...normalize(row), primary_image: list.find((m) => m.is_primary) ?? list[0] ?? null };
  });
}

export interface DiscoverContext {
  inventoryGlazeIds: string[];
  testedRecipeIds: string[];
}

export interface DiscoverResult {
  recipes: RecipeSummary[];
  total: number;
  hasMore: boolean;
  searchTags: string[];
}

const SEARCH_CANDIDATE_LIMIT = 200;

/** Turn free text into PostgREST `or` conditions over tags + the trigram-indexed search doc. */
function searchConditions(q: string): { conditions: string[]; tags: string[]; terms: string[] } {
  const intent = parseTextIntent(q);
  const tags = intentTags(intent).filter((t) => /^[a-z_-]+$/.test(t));
  const terms = intent.unmatched_terms.map((t) => t.replace(/[^\p{L}\p{N}-]/gu, "")).filter((t) => t.length >= 2);
  const conditions: string[] = [];
  if (tags.length) conditions.push(`all_tags.ov.{${tags.join(",")}}`);
  for (const term of terms) conditions.push(`search_doc.ilike.*${term}*`);
  return { conditions, tags, terms };
}

export async function listDiscoverRecipes(f: DiscoverFilters, ctx: DiscoverContext): Promise<DiscoverResult> {
  const supabase = await createClient();

  let query = supabase
    .from("recipes")
    .select(RECIPE_SELECT, { count: "exact" })
    .eq("status", "published")
    .eq("visibility", "public");

  if (f.brand.length) {
    const { data: brands } = await supabase.from("brands").select("id").in("slug", f.brand);
    const ids = (brands ?? []).map((b: { id: string }) => b.id);
    if (ids.length === 0) return { recipes: [], total: 0, hasMore: false, searchTags: [] };
    query = query.overlaps("brand_ids", ids);
  }
  if (f.glaze) {
    const { data: g } = await supabase.from("glazes").select("id").eq("slug", f.glaze).maybeSingle();
    if (!g) return { recipes: [], total: 0, hasMore: false, searchTags: [] };
    query = query.contains("glaze_ids", [(g as { id: string }).id]);
  }
  if (f.series) query = query.contains("series_names", [f.series]);
  if (f.color.length) query = query.overlaps("all_tags", f.color);
  if (f.effect.length) query = query.overlaps("effect_tags", f.effect);
  if (f.surface.length) query = query.overlaps("surface_tags", f.surface);
  if (f.cone !== null) query = query.eq("cone", f.cone);
  if (f.atmosphere) query = query.eq("atmosphere", f.atmosphere);
  if (f.clay) query = query.eq("clay_color", f.clay);
  if (f.glazes !== null) query = f.glazes >= 4 ? query.gte("glaze_count", 4) : query.eq("glaze_count", f.glazes);
  if (f.layers !== null) query = f.layers >= 4 ? query.gte("layer_count", 4) : query.eq("layer_count", f.layers);
  if (f.movement !== null) query = query.lte("movement_level", f.movement);
  if (f.risk !== null) query = query.lte("run_risk", f.risk);
  if (f.verified) query = query.neq("verification_status", "unverified");
  if (f.mine) {
    if (ctx.inventoryGlazeIds.length === 0) return { recipes: [], total: 0, hasMore: false, searchTags: [] };
    query = query.containedBy("glaze_ids", ctx.inventoryGlazeIds);
  }
  if (f.tested) {
    if (ctx.testedRecipeIds.length === 0) return { recipes: [], total: 0, hasMore: false, searchTags: [] };
    query = query.in("id", ctx.testedRecipeIds);
  }

  const limit = f.page * PAGE_SIZE;

  if (!f.q) {
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(0, limit - 1);
    if (error) throw error;
    const recipes = await hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
    const total = count ?? recipes.length;
    return { recipes, total, hasMore: total > limit, searchTags: [] };
  }

  // Text search: fetch a bounded candidate set, then rank by relevance in memory.
  const { conditions, tags, terms } = searchConditions(f.q);
  if (conditions.length === 0) return { recipes: [], total: 0, hasMore: false, searchTags: [] };
  const { data, error } = await query.or(conditions.join(",")).limit(SEARCH_CANDIDATE_LIMIT);
  if (error) throw error;

  const rows = (data ?? []) as (RecipeRow & { search_doc: string })[];
  const ranked = rows
    .map((row) => {
      const tagHits = tags.filter((t) => row.all_tags.includes(t)).length;
      const termHits = terms.filter((t) => row.search_doc.includes(t)).length;
      const titleHit = terms.some((t) => row.title.toLowerCase().includes(t)) ? 1 : 0;
      return { row, score: termHits * 3 + titleHit * 2 + tagHits };
    })
    .sort((a, b) => b.score - a.score);

  const page = ranked.slice(0, limit).map((r) => r.row);
  const recipes = await hydrateSummaries(supabase, page);
  return { recipes, total: ranked.length, hasMore: ranked.length > limit, searchTags: tags };
}

export async function getRecipeBySlug(slug: string): Promise<RecipeDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(`${RECIPE_SELECT}, sources:recipe_sources(*, source:sources(*))`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as RecipeRow & { sources: RecipeSource[] | null };
  const media = (await getMediaFor(supabase, "recipe", [row.id])).get(row.id) ?? [];
  return {
    ...normalize(row),
    primary_image: media.find((m) => m.is_primary) ?? media[0] ?? null,
    media,
    sources: [...(row.sources ?? [])]
      .filter((s) => s.source)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
  };
}

export async function getRecipeById(id: string): Promise<RecipeSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select(RECIPE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await hydrateSummaries(supabase, [data as RecipeRow]))[0];
}

/** Recipes sharing at least one glaze, newest first. */
export async function getRelatedRecipes(recipe: Pick<Recipe, "id" | "glaze_ids">, limit = 4): Promise<RecipeSummary[]> {
  if (recipe.glaze_ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("status", "published")
    .eq("visibility", "public")
    .overlaps("glaze_ids", recipe.glaze_ids)
    .neq("id", recipe.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
}

export async function getRecipesUsingGlaze(glazeId: string, limit = 50): Promise<RecipeSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .contains("glaze_ids", [glazeId])
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
}

/** Candidates for the recommender: everything visible to the user except archived/drafts of others. */
export async function getRecommendationCandidates(limit = 500): Promise<RecipeSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .or("status.eq.published,visibility.eq.private")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
}

export async function getRecipesByIds(ids: string[]): Promise<RecipeSummary[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select(RECIPE_SELECT).in("id", ids);
  if (error) throw error;
  const recipes = await hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
  return ids.map((id) => recipes.find((r) => r.id === id)).filter((r): r is RecipeSummary => Boolean(r));
}

export async function getSavedRecipes(userId: string): Promise<RecipeSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_recipes")
    .select("recipe_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return getRecipesByIds((data ?? []).map((r: { recipe_id: string }) => r.recipe_id));
}

export async function getSavedRecipeIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_recipes").select("recipe_id").eq("user_id", userId);
  return new Set((data ?? []).map((r: { recipe_id: string }) => r.recipe_id));
}

export async function getPersonalRecipes(userId: string): Promise<RecipeSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("created_by", userId)
    .eq("visibility", "private")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
}

/** Possible duplicates: same glazes in the same order, similar coats, same cone. */
export async function findSimilarRecipes(
  layers: { glaze_id: string; coat_count: number }[],
  cone: number | null,
): Promise<RecipeSummary[]> {
  if (layers.length === 0) return [];
  const supabase = await createClient();
  const glazeIds = Array.from(new Set(layers.map((l) => l.glaze_id)));
  let query = supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .contains("glaze_ids", glazeIds)
    .containedBy("glaze_ids", glazeIds)
    .eq("layer_count", layers.length);
  if (cone !== null) query = query.eq("cone", cone);
  const { data, error } = await query.limit(20);
  if (error) throw error;
  const recipes = await hydrateSummaries(supabase, (data ?? []) as RecipeRow[]);
  return recipes.filter((r) =>
    r.layers.every(
      (l, i) => l.glaze_id === layers[i].glaze_id && Math.abs(l.coat_count - layers[i].coat_count) <= 1,
    ),
  );
}
