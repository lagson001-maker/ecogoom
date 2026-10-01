// Deterministic scoring. Each component is normalized to 0..1, combined with
// SCORING_WEIGHTS, and reported 0..100. Keep UI code out of here.

import {
  BONUSES,
  COLOR_FIELD_WEIGHTS,
  DESIRED_COLOR_WEIGHTS,
  ENGINE_CONFIG,
  EVIDENCE_SCORES,
  PENALTIES,
  SCORING_WEIGHTS,
  type ScoringWeights,
} from "./config";
import { uniqueGlazeIds } from "./filters";
import { DESIRED_SURFACES, MOVEMENT_PREFERENCES, RISK_TOLERANCES } from "@/lib/vocabulary";
import type { RecipeSummary } from "@/types/domain";
import type {
  PersonalContext,
  RecommendationConstraints,
  ScoreBreakdown,
  VisualIntent,
} from "@/types/recommendation";

const N = ENGINE_CONFIG.neutral;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Effects + surfaces the user asked for (text/image intent + explicit surface constraint). */
export function desiredVisualTags(intent: VisualIntent, c: RecommendationConstraints): string[] {
  const fromSurface = c.desiredSurface.flatMap((s) => DESIRED_SURFACES.find((d) => d.value === s)?.tags ?? []);
  return Array.from(new Set([...intent.effect_tags, ...intent.surface, ...fromSurface]));
}

export function movementScore(target: VisualIntent["movement"], level: number | null): number | null {
  if (!target) return null;
  if (level === null) return N;
  const [lo, hi] = MOVEMENT_PREFERENCES.find((m) => m.value === target)!.range;
  if (level >= lo && level <= hi) return 1;
  const distance = level < lo ? lo - level : level - hi;
  return distance <= 1 ? 0.5 : 0;
}

export function visualScore(recipe: RecipeSummary, intent: VisualIntent, c: RecommendationConstraints): number {
  const desired = desiredVisualTags(intent, c);
  const have = new Set([...recipe.effect_tags, ...recipe.surface_tags]);
  const effect = desired.length ? desired.filter((t) => have.has(t)).length / desired.length : null;
  const movement = movementScore(c.movement ?? intent.movement, recipe.movement_level);

  if (effect !== null && movement !== null) return 0.7 * effect + 0.3 * movement;
  if (effect !== null) return effect;
  if (movement !== null) return movement;
  return N;
}

export function colorScore(recipe: RecipeSummary, intent: VisualIntent, c: RecommendationConstraints): number {
  const dominant = Array.from(new Set([...intent.dominant_colors, ...c.preferredColors]));
  const secondary = intent.secondary_colors.filter((x) => !dominant.includes(x));
  const desired = [
    ...dominant.map((color) => ({ color, w: DESIRED_COLOR_WEIGHTS.dominant })),
    ...secondary.map((color) => ({ color, w: DESIRED_COLOR_WEIGHTS.secondary })),
  ];
  if (desired.length === 0) return N;

  const recipeDominant = new Set(recipe.dominant_colors);
  const recipeSecondary = new Set(recipe.color_tags);
  let got = 0;
  let max = 0;
  for (const { color, w } of desired) {
    max += w;
    if (recipeDominant.has(color)) got += w * COLOR_FIELD_WEIGHTS.dominant;
    else if (recipeSecondary.has(color)) got += w * COLOR_FIELD_WEIGHTS.secondary;
  }
  return clamp01(got / max);
}

export function availabilityScore(recipe: RecipeSummary, personal: PersonalContext): { score: number; owned: number } {
  const ids = uniqueGlazeIds(recipe);
  const owned = ids.filter((id) => personal.inventoryGlazeIds.has(id)).length;
  if (personal.inventoryGlazeIds.size === 0 || ids.length === 0) return { score: N, owned };
  return { score: owned / ids.length, owned };
}

export function firingScore(recipe: RecipeSummary, c: RecommendationConstraints): number {
  let cone: number;
  if (c.cone === null) cone = 0.7;
  else if (recipe.cone === null) cone = 0.4;
  else if (recipe.cone === c.cone) cone = 1;
  else cone = 0.6; // within tolerance (hard filter removed the rest)

  let atmosphere = 1;
  if (c.atmosphere && recipe.atmosphere && recipe.atmosphere !== "unknown" && recipe.atmosphere !== c.atmosphere) {
    atmosphere = 0.5;
  }

  let clay = 1;
  if (c.clayBody && recipe.clay_body_text) {
    const wanted = c.clayBody.toLowerCase();
    clay = recipe.clay_body_text.toLowerCase().includes(wanted) ? 1 : 0.85;
  }
  return clamp01(cone * atmosphere * clay);
}

export function evidenceScore(recipe: RecipeSummary): number {
  return EVIDENCE_SCORES[recipe.verification_status] ?? EVIDENCE_SCORES.unverified;
}

export function personalScore(recipe: RecipeSummary, personal: PersonalContext): number {
  const rating = personal.testedRecipeRatings.get(recipe.id);
  if (rating === undefined) return 0.3;
  if (rating >= 4) return 1;
  if (rating === 3) return 0.5;
  return 0;
}

export function penaltyScore(recipe: RecipeSummary, intent: VisualIntent, c: RecommendationConstraints, personal: PersonalContext): number {
  let penalty = 0;
  const avoid = new Set([...intent.avoid_colors, ...c.avoidColors]);
  for (const color of recipe.color_tags) if (avoid.has(color)) penalty += PENALTIES.avoidColorSecondary;

  const tolerance = RISK_TOLERANCES.find((r) => r.value === c.riskTolerance)!;
  const runRisk = recipe.run_risk ?? 0;
  if (runRisk > tolerance.maxRunRisk) {
    penalty += (runRisk - tolerance.maxRunRisk) * PENALTIES.runRiskOverTolerancePerStep;
  }
  if (c.riskTolerance !== "experimental" && recipe.layers.some((l) => personal.runnyGlazeIds.has(l.glaze_id))) {
    penalty += PENALTIES.runnyHistory;
  }
  return penalty;
}

export function scoreRecipe(
  recipe: RecipeSummary,
  intent: VisualIntent,
  constraints: RecommendationConstraints,
  personal: PersonalContext,
  weights: ScoringWeights = SCORING_WEIGHTS,
): { breakdown: ScoreBreakdown; owned: number } {
  const visual = visualScore(recipe, intent, constraints);
  const color = colorScore(recipe, intent, constraints);
  const { score: availability, owned } = availabilityScore(recipe, personal);
  const firing = firingScore(recipe, constraints);
  const evidence = evidenceScore(recipe);
  const personalPart = personalScore(recipe, personal);
  const penalty = penaltyScore(recipe, intent, constraints, personal);

  const weighted =
    weights.visual * visual +
    weights.color * color +
    weights.availability * availability +
    weights.firing * firing +
    weights.evidence * evidence +
    weights.personal * personalPart;

  const brandBonus =
    constraints.preferredBrandIds.length > 0 && recipe.layers.some((l) => constraints.preferredBrandIds.includes(l.glaze.brand_id))
      ? BONUSES.preferredBrand
      : 0;

  const total = Math.round(clamp01(weighted + brandBonus - penalty) * 1000) / 10;

  return {
    breakdown: { visual, color, availability, firing, evidence, personal: personalPart, penalty, total },
    owned,
  };
}
