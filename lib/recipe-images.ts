// Which real photo can stand in for a recipe that has none of its own.
// A manufacturer test tile counts only when it shows exactly this combination:
// the same two glazes, in the same order, at the same cone (when both state one).

import type { GlazePairing, RecipeReferenceImage, RecipeSummary } from "@/types/domain";

type Matchable = Pick<RecipeSummary, "cone"> & { layers: Pick<RecipeSummary["layers"][number], "glaze_id" | "layer_position">[] };

export function matchTile(recipe: Matchable, pairings: GlazePairing[]): RecipeReferenceImage | null {
  const layers = [...recipe.layers].sort((a, b) => a.layer_position - b.layer_position);
  if (layers.length !== 2 || layers[0].glaze_id === layers[1].glaze_id) return null;
  const [bottom, top] = [layers[0].glaze_id, layers[1].glaze_id];
  const candidates = pairings.filter(
    (p) =>
      p.image_url &&
      ((p.glaze_id === top && p.other_glaze_id === bottom && p.arrangement === "over") ||
        (p.glaze_id === bottom && p.other_glaze_id === top && p.arrangement === "under")) &&
      (recipe.cone === null || p.cone === null || p.cone === recipe.cone),
  );
  // Prefer a tile fired at the recipe's own cone over one with no cone recorded.
  const best = candidates.find((p) => p.cone !== null && p.cone === recipe.cone) ?? candidates[0];
  return best
    ? { kind: "manufacturer_tile", url: best.image_url!, credit: best.image_credit, source_url: best.source_url }
    : null;
}

export type RecipeVisualKind = "own_photo" | "manufacturer_tile" | "glaze_photos" | "illustration";

/**
 * Best available picture, most trustworthy first:
 * 1. a photo attached to this recipe, 2. a manufacturer tile of this exact combination,
 * 3. real fired photos of each glaze on its own (not the combination), 4. a swatch illustration.
 */
export function recipeVisualKind(
  recipe: Pick<RecipeSummary, "primary_image" | "reference_image"> & { layers: { glaze: { image_url: string | null } }[] },
): RecipeVisualKind {
  if (recipe.primary_image) return "own_photo";
  if (recipe.reference_image) return "manufacturer_tile";
  if (recipe.layers.length > 0 && recipe.layers.every((l) => l.glaze.image_url)) return "glaze_photos";
  return "illustration";
}
