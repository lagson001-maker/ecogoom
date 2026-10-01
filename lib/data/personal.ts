import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GLAZE_JOIN } from "./recipes";
import { getMediaFor } from "./media";
import type {
  Experiment,
  ExperimentLayerWithGlaze,
  ExperimentWithLayers,
  InventoryItemWithGlaze,
  Recipe,
} from "@/types/domain";
import type { PersonalContext } from "@/types/recommendation";

const EXPERIMENT_SELECT = `*, layers:experiment_layers(*, glaze:glazes(${GLAZE_JOIN})), recipe:recipes!experiments_recipe_id_fkey(id,slug,title)`;

type ExperimentRow = Experiment & {
  layers: ExperimentLayerWithGlaze[] | null;
  recipe: Pick<Recipe, "id" | "slug" | "title"> | null;
};

// --- inventory -----------------------------------------------------------------

export async function getInventory(userId: string): Promise<InventoryItemWithGlaze[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_inventory")
    .select(`*, glaze:glazes(${GLAZE_JOIN})`)
    .eq("user_id", userId)
    .order("favorite", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryItemWithGlaze[]).filter((i) => i.glaze);
}

export async function getInventoryGlazeIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("user_inventory").select("glaze_id").eq("user_id", userId).eq("in_stock", true);
  return (data ?? []).map((r: { glaze_id: string }) => r.glaze_id);
}

// --- experiments ---------------------------------------------------------------

async function hydrateExperiments(rows: ExperimentRow[]): Promise<ExperimentWithLayers[]> {
  const supabase = await createClient();
  const media = await getMediaFor(supabase, "experiment", rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    layers: [...(row.layers ?? [])].sort((a, b) => a.layer_position - b.layer_position),
    photos: media.get(row.id) ?? [],
  }));
}

export async function listExperiments(userId: string): Promise<ExperimentWithLayers[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiments")
    .select(EXPERIMENT_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return hydrateExperiments((data ?? []) as ExperimentRow[]);
}

export async function getExperiment(id: string): Promise<ExperimentWithLayers | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("experiments").select(EXPERIMENT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await hydrateExperiments([data as ExperimentRow]))[0];
}

export async function getExperimentsForRecipe(userId: string | null, recipeId: string): Promise<ExperimentWithLayers[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiments")
    .select(EXPERIMENT_SELECT)
    .eq("user_id", userId)
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return hydrateExperiments((data ?? []) as ExperimentRow[]);
}

export async function getExperimentsUsingGlaze(userId: string | null, glazeId: string): Promise<ExperimentWithLayers[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data: layerRows } = await supabase.from("experiment_layers").select("experiment_id").eq("glaze_id", glazeId);
  const ids = Array.from(new Set((layerRows ?? []).map((r: { experiment_id: string }) => r.experiment_id)));
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("experiments").select(EXPERIMENT_SELECT).in("id", ids).eq("user_id", userId);
  if (error) throw error;
  return hydrateExperiments((data ?? []) as ExperimentRow[]);
}

export async function getTestedRecipeIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("experiments")
    .select("recipe_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("recipe_id", "is", null);
  return Array.from(new Set((data ?? []).map((r: { recipe_id: string }) => r.recipe_id)));
}

// --- recommendation context ----------------------------------------------------

/** How many "too_runny" experiments before a glaze counts as runny for this user. */
const RUNNY_THRESHOLD = 2;

export async function getPersonalContext(userId: string | null): Promise<PersonalContext> {
  const context: PersonalContext = {
    inventoryGlazeIds: new Set(),
    testedRecipeRatings: new Map(),
    runnyGlazeIds: new Set(),
  };
  if (!userId) return context;

  const supabase = await createClient();
  const [inventory, experiments] = await Promise.all([
    getInventoryGlazeIds(userId),
    supabase
      .from("experiments")
      .select("recipe_id, rating, result_tags, layers:experiment_layers(glaze_id)")
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);
  context.inventoryGlazeIds = new Set(inventory);

  const runnyCounts = new Map<string, number>();
  type Row = { recipe_id: string | null; rating: number | null; result_tags: string[]; layers: { glaze_id: string }[] };
  for (const e of (experiments.data ?? []) as Row[]) {
    if (e.recipe_id && e.rating !== null) {
      context.testedRecipeRatings.set(e.recipe_id, Math.max(context.testedRecipeRatings.get(e.recipe_id) ?? 0, e.rating));
    }
    if (e.result_tags?.includes("too_runny")) {
      for (const id of new Set(e.layers.map((l) => l.glaze_id))) runnyCounts.set(id, (runnyCounts.get(id) ?? 0) + 1);
    }
  }
  for (const [id, n] of runnyCounts) if (n >= RUNNY_THRESHOLD) context.runnyGlazeIds.add(id);
  return context;
}
