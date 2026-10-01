"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { bool, int, isUuid, layersFromForm, oneOf, str, tags, type ActionState } from "@/lib/forms";
import { uniqueSlug } from "@/lib/utils";
import { ATMOSPHERES, CLAY_COLORS, OPACITIES } from "@/lib/vocabulary";
import { getCopy } from "@/lib/i18n/server";
import type { DinnerwareSuitability, RecipeStatus, SourceType, VerificationStatus, Visibility } from "@/types/domain";

const SOURCE_TYPES: SourceType[] = ["manufacturer", "community", "personal", "imported", "unknown"];
const VERIFICATIONS: VerificationStatus[] = [
  "unverified",
  "community_reported",
  "manufacturer_documented",
  "personally_tested",
  "repeated_test",
];
const STATUSES: RecipeStatus[] = ["draft", "published", "archived"];
const DINNERWARE: DinnerwareSuitability[] = ["verified", "manufacturer_guidance", "unknown", "not_recommended"];

export async function toggleSaveRecipe(recipeId: string): Promise<{ saved: boolean; error?: string }> {
  const copy = await getCopy();
  const viewer = await getViewer();
  if (!viewer.userId) return { saved: false, error: copy.auth.required };
  if (!isUuid(recipeId)) return { saved: false, error: copy.errors.generic };
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", viewer.userId)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("saved_recipes").delete().eq("user_id", viewer.userId).eq("recipe_id", recipeId);
    if (error) return { saved: true, error: error.message };
    revalidatePath("/saved");
    return { saved: false };
  }
  const { error } = await supabase.from("saved_recipes").insert({ user_id: viewer.userId, recipe_id: recipeId });
  if (error) return { saved: false, error: error.message };
  revalidatePath("/saved");
  return { saved: true };
}

/** Create or update a recipe with its ordered layers and an optional new source. */
export async function saveRecipe(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  const viewer = await getViewer();
  if (!viewer.userId) return { ok: false, message: copy.auth.required };

  const id = str(fd, "id");
  const title = str(fd, "title", 200);
  const layers = layersFromForm(fd);
  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = copy.form.titleRequired;
  if (layers.length === 0) fieldErrors.layers = copy.editor.needLayer;
  if (Object.keys(fieldErrors).length) return { ok: false, message: copy.form.fixFields, fieldErrors };

  // Non-editors can only ever write private, personal recipes.
  const visibility: Visibility = viewer.isEditor ? (oneOf(str(fd, "visibility"), ["public", "private"] as const) ?? "public") : "private";
  const sourceType: SourceType =
    visibility === "private" && !viewer.isEditor ? "personal" : (oneOf(str(fd, "source_type"), SOURCE_TYPES) ?? "unknown");
  let verification = oneOf(str(fd, "verification_status"), VERIFICATIONS) ?? "unverified";
  if (!viewer.isEditor && !["unverified", "personally_tested", "repeated_test"].includes(verification)) verification = "unverified";

  const record = {
    title: title!,
    description: str(fd, "description"),
    cone: int(fd, "cone", -22, 14),
    atmosphere: oneOf(str(fd, "atmosphere"), ATMOSPHERES.map((a) => a.value)),
    clay_body_text: str(fd, "clay_body_text", 200),
    clay_color: oneOf(str(fd, "clay_color"), CLAY_COLORS.map((c) => c.value)),
    application_method: str(fd, "application_method", 200),
    result_description: str(fd, "result_description"),
    prediction_notes: str(fd, "prediction_notes"),
    dominant_colors: tags(fd, "dominant_colors"),
    color_tags: tags(fd, "color_tags"),
    surface_tags: tags(fd, "surface_tags"),
    effect_tags: tags(fd, "effect_tags"),
    movement_level: int(fd, "movement_level", 0, 5),
    run_risk: int(fd, "run_risk", 0, 5),
    pinhole_risk: int(fd, "pinhole_risk", 0, 5),
    crawl_risk: int(fd, "crawl_risk", 0, 5),
    opacity: oneOf(str(fd, "opacity"), OPACITIES),
    dinnerware_suitability: viewer.isEditor ? (oneOf(str(fd, "dinnerware_suitability"), DINNERWARE) ?? "unknown") : "unknown",
    source_type: sourceType,
    verification_status: verification,
    status: oneOf(str(fd, "status"), STATUSES) ?? (visibility === "private" ? "published" : "draft"),
    visibility,
  };

  const supabase = await createClient();
  let recipeId = id;
  let slug: string;

  if (id) {
    if (!isUuid(id)) return { ok: false, message: copy.errors.generic };
    const { data, error } = await supabase.from("recipes").update(record).eq("id", id).select("id, slug").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: copy.errors.unauthorized };
    slug = data.slug;
  } else {
    const parent = str(fd, "parent_recipe_id");
    const { data, error } = await supabase
      .from("recipes")
      .insert({ ...record, slug: uniqueSlug(title!), created_by: viewer.userId, parent_recipe_id: isUuid(parent) ? parent : null })
      .select("id, slug")
      .single();
    if (error) return { ok: false, message: error.message };
    recipeId = data.id;
    slug = data.slug;
  }

  const { error: layerError } = await supabase.rpc("replace_recipe_layers", { p_recipe_id: recipeId, p_layers: layers });
  if (layerError) return { ok: false, message: layerError.message };

  // Optional new provenance record.
  const sourceName = str(fd, "source_name", 200);
  if (sourceName) {
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .insert({
        name: sourceName,
        url: str(fd, "source_url", 1000),
        author: str(fd, "source_author", 200),
        source_date: str(fd, "source_date", 10),
        source_type: sourceType,
        evidence_level: verification,
        notes: str(fd, "source_notes"),
        created_by: viewer.userId,
      })
      .select("id")
      .single();
    if (sourceError) return { ok: false, message: sourceError.message };
    const { count } = await supabase.from("recipe_sources").select("*", { count: "exact", head: true }).eq("recipe_id", recipeId);
    await supabase.from("recipe_sources").insert({ recipe_id: recipeId, source_id: source.id, is_primary: (count ?? 0) === 0 });
  }

  revalidatePath("/");
  revalidatePath(`/recipes/${slug}`);
  if (bool(fd, "stay")) return { ok: true, message: copy.admin.savedMsg };
  redirect(`/recipes/${slug}`);
}

/** Duplicate any visible recipe into a private personal variation, then open the editor. */
export async function createVariation(recipeId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/login");
  if (!isUuid(recipeId)) redirect("/");
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("recipes")
    .select("*, layers:recipe_layers(*)")
    .eq("id", recipeId)
    .maybeSingle();
  if (!original) redirect("/");

  const { data: copyRow, error } = await supabase
    .from("recipes")
    .insert({
      created_by: viewer.userId,
      visibility: "private",
      status: "draft",
      parent_recipe_id: original.id,
      title: `${original.title} (variation)`,
      slug: uniqueSlug(original.title),
      description: original.description,
      cone: original.cone,
      atmosphere: original.atmosphere,
      clay_body_text: original.clay_body_text,
      clay_color: original.clay_color,
      application_method: original.application_method,
      dominant_colors: original.dominant_colors,
      color_tags: original.color_tags,
      surface_tags: original.surface_tags,
      effect_tags: original.effect_tags,
      movement_level: original.movement_level,
      run_risk: original.run_risk,
      opacity: original.opacity,
      source_type: "personal",
      verification_status: "unverified",
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);

  type L = { layer_position: number; glaze_id: string; coat_count: number; coverage_area: string; coverage_percent: number | null; application_method: string | null; notes: string | null };
  const layers = [...((original.layers ?? []) as L[])]
    .sort((a, b) => a.layer_position - b.layer_position)
    .map(({ layer_position: _p, ...l }) => l);
  const { error: layerError } = await supabase.rpc("replace_recipe_layers", { p_recipe_id: copyRow.id, p_layers: layers });
  if (layerError) throw new Error(layerError.message);

  redirect(`/recipes/${copyRow.slug}/edit`);
}

export async function setRecipeStatus(recipeId: string, status: RecipeStatus): Promise<{ error?: string }> {
  const copy = await getCopy();
  const viewer = await getViewer();
  if (!viewer.userId) return { error: copy.auth.required };
  if (!isUuid(recipeId) || !STATUSES.includes(status)) return { error: copy.errors.generic };
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").update({ status }).eq("id", recipeId).select("slug").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: copy.errors.unauthorized };
  revalidatePath("/");
  revalidatePath(`/recipes/${data.slug}`);
  revalidatePath("/admin/recipes");
  return {};
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(recipeId)) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(viewer.isEditor ? "/admin/recipes" : "/lab");
}
