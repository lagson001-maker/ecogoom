"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { bool, int, isUuid, layersFromForm, oneOf, str, tags, type ActionState } from "@/lib/forms";
import { uniqueSlug } from "@/lib/utils";
import { ATMOSPHERES, CLAY_COLORS, EFFECT_TAGS, SURFACE_TAGS } from "@/lib/vocabulary";
import { copy } from "@/lib/i18n";
import type { ExperimentStatus, SuccessLevel } from "@/types/domain";

const STATUSES: ExperimentStatus[] = ["in_progress", "waiting_firing", "completed"];
const SUCCESS: SuccessLevel[] = ["success", "partial", "failure"];

async function requireUserId(next: string): Promise<string> {
  const viewer = await getViewer();
  if (!viewer.userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer.userId;
}

type LayerRow = {
  layer_position: number;
  glaze_id: string;
  coat_count: number;
  coverage_area: string;
  coverage_percent: number | null;
  application_method: string | null;
  notes: string | null;
};

function stripPositions(layers: LayerRow[]) {
  return [...layers].sort((a, b) => a.layer_position - b.layer_position).map(({ layer_position: _p, ...rest }) => rest);
}

/** "Test this combo": clone a recipe's configuration into a new experiment. */
export async function startExperimentFromRecipe(recipeId: string): Promise<void> {
  const userId = await requireUserId("/lab");
  if (!isUuid(recipeId)) redirect("/lab");
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, title, cone, atmosphere, clay_body_text, clay_color, application_method, layers:recipe_layers(*)")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) redirect("/");

  const { data: experiment, error } = await supabase
    .from("experiments")
    .insert({
      user_id: userId,
      recipe_id: recipe.id,
      title: `Test: ${recipe.title}`,
      status: "in_progress",
      cone: recipe.cone,
      atmosphere: recipe.atmosphere,
      clay_body: recipe.clay_body_text,
      clay_color: recipe.clay_color,
      application_notes: recipe.application_method,
      test_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: layerError } = await supabase.rpc("replace_experiment_layers", {
    p_experiment_id: experiment.id,
    p_layers: stripPositions((recipe.layers ?? []) as LayerRow[]),
  });
  if (layerError) throw new Error(layerError.message);

  revalidatePath("/lab");
  redirect(`/lab/${experiment.id}?edit=1`);
}

export async function createBlankExperiment(): Promise<void> {
  const userId = await requireUserId("/lab/new");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiments")
    .insert({ user_id: userId, title: "New test", status: "in_progress", test_date: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/lab/${data.id}?edit=1`);
}

export async function saveExperiment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.userId) return { ok: false, message: copy.auth.required };
  const id = str(fd, "id");
  if (!isUuid(id)) return { ok: false, message: copy.errors.generic };
  const title = str(fd, "title", 200);
  if (!title) return { ok: false, message: "Title is required.", fieldErrors: { title: "Title is required." } };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiments")
    .update({
      title,
      status: oneOf(str(fd, "status"), STATUSES) ?? "in_progress",
      clay_body: str(fd, "clay_body", 200),
      clay_color: oneOf(str(fd, "clay_color"), CLAY_COLORS.map((c) => c.value)),
      cone: int(fd, "cone", -22, 14),
      atmosphere: oneOf(str(fd, "atmosphere"), ATMOSPHERES.map((a) => a.value)),
      kiln_notes: str(fd, "kiln_notes"),
      application_notes: str(fd, "application_notes"),
      result_notes: str(fd, "result_notes"),
      rating: int(fd, "rating", 1, 5),
      success_level: oneOf(str(fd, "success_level"), SUCCESS),
      movement_level: int(fd, "movement_level", 0, 5),
      run_risk_observed: int(fd, "run_risk_observed", 0, 5),
      result_tags: tags(fd, "result_tags"),
      favorite: bool(fd, "favorite"),
      test_date: str(fd, "test_date", 10),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: copy.errors.unauthorized };

  const layers = layersFromForm(fd);
  const { error: layerError } = await supabase.rpc("replace_experiment_layers", { p_experiment_id: id, p_layers: layers });
  if (layerError) return { ok: false, message: layerError.message };

  revalidatePath("/lab");
  revalidatePath(`/lab/${id}`);
  redirect(`/lab/${id}`);
}

export async function toggleExperimentFavorite(id: string, favorite: boolean): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(id)) return;
  const supabase = await createClient();
  await supabase.from("experiments").update({ favorite }).eq("id", id);
  revalidatePath("/lab");
  revalidatePath(`/lab/${id}`);
}

export async function setExperimentStatus(id: string, status: ExperimentStatus): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(id) || !STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("experiments").update({ status }).eq("id", id);
  revalidatePath("/lab");
  revalidatePath(`/lab/${id}`);
}

export async function deleteExperiment(id: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(id)) redirect("/lab");
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("media_assets")
    .select("id, bucket, storage_path")
    .eq("owner_type", "experiment")
    .eq("owner_id", id);
  const paths = (media ?? []).map((m: { storage_path: string }) => m.storage_path);
  if (paths.length) await supabase.storage.from("private-user-assets").remove(paths);
  await supabase.from("media_assets").delete().eq("owner_type", "experiment").eq("owner_id", id);
  await supabase.from("experiments").delete().eq("id", id);
  revalidatePath("/lab");
  redirect("/lab");
}

/** Turn a (successful) experiment into a private personal recipe. The experiment is kept. */
export async function promoteExperiment(id: string): Promise<void> {
  const userId = await requireUserId("/lab");
  if (!isUuid(id)) redirect("/lab");
  const supabase = await createClient();

  const { data: exp } = await supabase
    .from("experiments")
    .select("*, layers:experiment_layers(*)")
    .eq("id", id)
    .maybeSingle();
  if (!exp) redirect("/lab");
  if (exp.promoted_recipe_id) {
    const { data: existing } = await supabase.from("recipes").select("slug").eq("id", exp.promoted_recipe_id).maybeSingle();
    if (existing) redirect(`/recipes/${existing.slug}`);
  }

  const resultTags: string[] = exp.result_tags ?? [];
  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      created_by: userId,
      visibility: "private",
      status: "published",
      parent_recipe_id: exp.recipe_id,
      title: exp.title.replace(/^Test:\s*/i, ""),
      slug: uniqueSlug(exp.title),
      cone: exp.cone,
      atmosphere: exp.atmosphere,
      clay_body_text: exp.clay_body,
      clay_color: exp.clay_color,
      application_method: exp.application_notes,
      result_description: exp.result_notes,
      effect_tags: resultTags.filter((t) => (EFFECT_TAGS as readonly string[]).includes(t)),
      surface_tags: resultTags.filter((t) => (SURFACE_TAGS as readonly string[]).includes(t)),
      movement_level: exp.movement_level,
      run_risk: exp.run_risk_observed,
      user_rating: exp.rating,
      source_type: "personal",
      verification_status: "personally_tested",
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);

  const { error: layerError } = await supabase.rpc("replace_recipe_layers", {
    p_recipe_id: recipe.id,
    p_layers: stripPositions((exp.layers ?? []) as LayerRow[]),
  });
  if (layerError) throw new Error(layerError.message);

  // Reuse the experiment's photos as recipe media (same private files).
  const { data: photos } = await supabase
    .from("media_assets")
    .select("bucket, storage_path, caption, alt_text, is_primary")
    .eq("owner_type", "experiment")
    .eq("owner_id", id);
  if (photos?.length) {
    // A storage object can back several media rows only with distinct paths; copy them.
    for (const [i, p] of photos.entries()) {
      const target = `${userId}/recipes/${recipe.id}/${i}-${p.storage_path.split("/").pop()}`;
      const { error: copyError } = await supabase.storage.from("private-user-assets").copy(p.storage_path, target);
      if (copyError) continue;
      await supabase.from("media_assets").insert({
        owner_type: "recipe",
        owner_id: recipe.id,
        bucket: "private-user-assets",
        storage_path: target,
        caption: p.caption,
        alt_text: p.alt_text,
        is_primary: i === 0,
        created_by: userId,
      });
    }
  }

  await supabase.from("experiments").update({ promoted_recipe_id: recipe.id }).eq("id", id);
  revalidatePath("/lab");
  redirect(`/recipes/${recipe.slug}`);
}
