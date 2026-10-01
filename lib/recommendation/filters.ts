// Hard constraints. A candidate that violates any of these is removed before
// scoring — no similarity score can override an explicit user constraint.

import { ENGINE_CONFIG } from "./config";
import type { RecipeSummary } from "@/types/domain";
import type { PersonalContext, RecommendationConstraints } from "@/types/recommendation";

export type RejectionReason =
  | "cone_mismatch"
  | "glaze_cone_range"
  | "not_in_inventory"
  | "glaze_not_allowed"
  | "brand_excluded"
  | "too_many_glazes"
  | "too_many_layers"
  | "atmosphere_mismatch"
  | "avoided_color"
  | "too_risky"
  | "no_layers";

export interface FilterOutcome {
  passed: RecipeSummary[];
  rejected: { recipe: RecipeSummary; reason: RejectionReason }[];
}

export function checkHardConstraints(
  recipe: RecipeSummary,
  c: RecommendationConstraints,
  personal: PersonalContext,
): RejectionReason | null {
  if (recipe.layers.length === 0) return "no_layers";

  if (c.cone !== null && recipe.cone !== null && Math.abs(recipe.cone - c.cone) > ENGINE_CONFIG.coneTolerance) {
    return "cone_mismatch";
  }

  // A glaze rated for a range that excludes the requested cone is incompatible
  // even when the recipe itself has no cone recorded.
  if (c.cone !== null) {
    for (const layer of recipe.layers) {
      const { cone_min, cone_max } = layer.glaze;
      const tol = ENGINE_CONFIG.coneTolerance;
      if ((cone_min !== null && c.cone < cone_min - tol) || (cone_max !== null && c.cone > cone_max + tol)) {
        return "glaze_cone_range";
      }
    }
  }

  const glazeIds = uniqueGlazeIds(recipe);

  if (c.onlyMyGlazes && glazeIds.some((id) => !personal.inventoryGlazeIds.has(id))) {
    return "not_in_inventory";
  }

  if (c.allowedGlazeIds.length > 0) {
    const allowed = new Set(c.allowedGlazeIds);
    if (glazeIds.some((id) => !allowed.has(id))) return "glaze_not_allowed";
  }

  if (c.excludedBrandIds.length > 0) {
    const excluded = new Set(c.excludedBrandIds);
    if (recipe.layers.some((l) => excluded.has(l.glaze.brand_id))) return "brand_excluded";
  }

  if (c.maxGlazes !== null && glazeIds.length > c.maxGlazes) return "too_many_glazes";
  if (c.maxLayers !== null && recipe.layers.length > c.maxLayers) return "too_many_layers";

  if (
    c.atmosphereRequired &&
    c.atmosphere &&
    recipe.atmosphere &&
    recipe.atmosphere !== "unknown" &&
    recipe.atmosphere !== c.atmosphere
  ) {
    return "atmosphere_mismatch";
  }

  if (c.avoidColors.length > 0 && recipe.dominant_colors.some((col) => c.avoidColors.includes(col))) {
    return "avoided_color";
  }

  if (c.riskTolerance === "low" && (recipe.run_risk ?? 0) >= ENGINE_CONFIG.highRunRisk) {
    return "too_risky";
  }

  return null;
}

export function applyHardFilters(
  recipes: RecipeSummary[],
  constraints: RecommendationConstraints,
  personal: PersonalContext,
): FilterOutcome {
  const outcome: FilterOutcome = { passed: [], rejected: [] };
  for (const recipe of recipes) {
    const reason = checkHardConstraints(recipe, constraints, personal);
    if (reason) outcome.rejected.push({ recipe, reason });
    else outcome.passed.push(recipe);
  }
  return outcome;
}

export function uniqueGlazeIds(recipe: RecipeSummary): string[] {
  return Array.from(new Set(recipe.layers.map((l) => l.glaze_id)));
}
