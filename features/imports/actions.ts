"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { findSimilarRecipes } from "@/lib/data/recipes";
import { getAIProvider } from "@/lib/ai";
import { int, isUuid, layersFromForm, oneOf, str, tags, type ActionState } from "@/lib/forms";
import { isSafeStoragePath } from "@/lib/storage";
import { uniqueSlug } from "@/lib/utils";
import { ATMOSPHERES, CLAY_COLORS } from "@/lib/vocabulary";
import { copy } from "@/lib/i18n";
import type { SourceType, VerificationStatus } from "@/types/domain";

const SOURCE_TYPES: SourceType[] = ["manufacturer", "community", "personal", "imported", "unknown"];

/** Step 1: store what the user gave us as a draft; optionally ask AI for a suggested extraction. */
export async function createImportDraft(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.userId) return { ok: false, message: copy.auth.required };

  const url = str(fd, "source_url", 1000);
  const rawText = str(fd, "raw_text", 20000);
  const imagePath = str(fd, "image_path", 300);
  if (!url && !rawText && !imagePath) return { ok: false, message: "Add a URL, some text or a screenshot." };
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, message: "URL must start with http(s)://", fieldErrors: { source_url: "Invalid URL" } };
  if (imagePath && (!isSafeStoragePath(imagePath) || !imagePath.startsWith(`${viewer.userId}/`))) {
    return { ok: false, message: copy.errors.invalidImage };
  }

  const supabase = await createClient();
  const { data: draft, error } = await supabase
    .from("import_drafts")
    .insert({
      user_id: viewer.userId,
      source_url: url,
      source_name: str(fd, "source_name", 200),
      source_author: str(fd, "source_author", 200),
      source_type: oneOf(str(fd, "source_type"), SOURCE_TYPES) ?? "community",
      raw_text: rawText,
      image_path: imagePath,
      notes: str(fd, "notes", 2000),
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  // AI suggestion is optional and never published automatically.
  const ai = getAIProvider();
  if (ai) {
    try {
      let image = null;
      if (imagePath) {
        const { data: blob } = await supabase.storage.from("private-user-assets").download(imagePath);
        if (blob && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(blob.type) && blob.size <= 5 * 1024 * 1024) {
          image = {
            base64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
            mediaType: blob.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          };
        }
      }
      const extracted = await ai.extractImport({ text: rawText, url, image });
      await supabase.from("import_drafts").update({ extracted }).eq("id", draft.id);
    } catch (e) {
      console.error("[import] AI extraction failed", e);
    }
  }

  revalidatePath("/import");
  redirect(`/import/${draft.id}`);
}

export async function discardImportDraft(id: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(id)) redirect("/import");
  const supabase = await createClient();
  await supabase.from("import_drafts").update({ status: "discarded" }).eq("id", id);
  revalidatePath("/import");
  redirect("/import");
}

export type ApproveState =
  | (ActionState & { duplicates?: { id: string; slug: string; title: string; canMerge: boolean }[] })
  | null;

/** Step 3: the reviewer confirmed every field. Create source + recipe, or merge the source into a duplicate. */
export async function approveImport(_prev: ApproveState, fd: FormData): Promise<ApproveState> {
  const viewer = await getViewer();
  if (!viewer.userId) return { ok: false, message: copy.auth.required };
  const draftId = str(fd, "draft_id");
  if (!isUuid(draftId)) return { ok: false, message: copy.errors.generic };

  const supabase = await createClient();
  const { data: draft } = await supabase.from("import_drafts").select("*").eq("id", draftId).maybeSingle();
  if (!draft || draft.status !== "draft") return { ok: false, message: "This import was already handled." };

  const title = str(fd, "title", 200);
  const layers = layersFromForm(fd);
  const cone = int(fd, "cone", -22, 14);
  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (layers.length === 0) fieldErrors.layers = copy.editor.needLayer;
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

  const decision = str(fd, "duplicate_decision"); // null | "separate:<recipeId>" | "merge:<recipeId>"

  // Duplicate check (same glazes, same order, similar coats, same cone).
  if (!decision) {
    const similar = await findSimilarRecipes(layers, cone);
    if (similar.length) {
      return {
        ok: false,
        message: copy.import.duplicate,
        duplicates: similar.map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          canMerge: (r.visibility === "private" && r.created_by === viewer.userId) || (r.visibility === "public" && viewer.isEditor),
        })),
      };
    }
  }

  const sourceType = oneOf(str(fd, "source_type"), SOURCE_TYPES) ?? draft.source_type;
  const evidence: VerificationStatus = sourceType === "manufacturer" ? "manufacturer_documented" : sourceType === "community" ? "community_reported" : "unverified";
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      name: str(fd, "source_name", 200) ?? draft.source_url ?? "Imported reference",
      url: str(fd, "source_url", 1000),
      author: str(fd, "source_author", 200),
      source_date: str(fd, "source_date", 10),
      source_type: sourceType,
      evidence_level: evidence,
      notes: draft.notes,
      created_by: viewer.userId,
    })
    .select("id")
    .single();
  if (sourceError) return { ok: false, message: sourceError.message };

  let recipeId: string;
  let slug: string;

  if (decision?.startsWith("merge:")) {
    const target = decision.slice(6);
    if (!isUuid(target)) return { ok: false, message: copy.errors.generic };
    const { error } = await supabase.from("recipe_sources").insert({ recipe_id: target, source_id: source.id, is_primary: false });
    if (error) return { ok: false, message: error.code === "42501" ? copy.errors.unauthorized : error.message };
    const { data: r } = await supabase.from("recipes").select("id, slug").eq("id", target).single();
    recipeId = r!.id;
    slug = r!.slug;
  } else {
    const isPublic = viewer.isEditor && str(fd, "visibility") === "public";
    const parentId = decision?.startsWith("separate:") ? decision.slice(9) : null;
    const { data: recipe, error } = await supabase
      .from("recipes")
      .insert({
        created_by: viewer.userId,
        visibility: isPublic ? "public" : "private",
        status: isPublic ? "draft" : "published",
        parent_recipe_id: isUuid(parentId) ? parentId : null,
        title: title!,
        slug: uniqueSlug(title!),
        description: str(fd, "description"),
        cone,
        atmosphere: oneOf(str(fd, "atmosphere"), ATMOSPHERES.map((a) => a.value)),
        clay_body_text: str(fd, "clay_body_text", 200),
        clay_color: oneOf(str(fd, "clay_color"), CLAY_COLORS.map((c) => c.value)),
        result_description: str(fd, "result_description"),
        dominant_colors: tags(fd, "dominant_colors"),
        color_tags: tags(fd, "color_tags"),
        surface_tags: tags(fd, "surface_tags"),
        effect_tags: tags(fd, "effect_tags"),
        movement_level: int(fd, "movement_level", 0, 5),
        run_risk: int(fd, "run_risk", 0, 5),
        source_type: sourceType,
        verification_status: evidence,
      })
      .select("id, slug")
      .single();
    if (error) return { ok: false, message: error.message };
    recipeId = recipe.id;
    slug = recipe.slug;

    const { error: layerError } = await supabase.rpc("replace_recipe_layers", { p_recipe_id: recipeId, p_layers: layers });
    if (layerError) return { ok: false, message: layerError.message };
    await supabase.from("recipe_sources").insert({ recipe_id: recipeId, source_id: source.id, is_primary: true });
  }

  await supabase.from("import_drafts").update({ status: "approved", recipe_id: recipeId }).eq("id", draftId);
  revalidatePath("/import");
  revalidatePath("/sources");
  redirect(`/recipes/${slug}`);
}
