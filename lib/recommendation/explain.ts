// Short, factual match reasons derived from data — never invented.

import { ENGINE_CONFIG } from "./config";
import { desiredVisualTags } from "./scoring";
import { copy } from "@/lib/i18n";
import { humanizeTag, riskLevel } from "@/lib/vocabulary";
import type { RecipeSummary } from "@/types/domain";
import type { RecommendationConstraints, ScoreBreakdown, VisualIntent } from "@/types/recommendation";

const t = copy.recommendation;

export function buildReasons(
  recipe: RecipeSummary,
  intent: VisualIntent,
  c: RecommendationConstraints,
  score: ScoreBreakdown,
  owned: number,
): string[] {
  const reasons: string[] = [];

  const wantedColors = new Set([...intent.dominant_colors, ...intent.secondary_colors, ...c.preferredColors]);
  const colorHits = [...recipe.dominant_colors, ...recipe.color_tags].filter((x) => wantedColors.has(x));
  if (colorHits.length) reasons.push(t.reasonPalette(Array.from(new Set(colorHits)).slice(0, 3).join(" / ")));

  const wantedEffects = new Set(desiredVisualTags(intent, c));
  const effectHits = [...recipe.effect_tags, ...recipe.surface_tags].filter((x) => wantedEffects.has(x));
  if (effectHits.length) reasons.push(Array.from(new Set(effectHits)).slice(0, 3).map(humanizeTag).join(", "));

  if ((c.movement ?? intent.movement) && recipe.movement_level !== null && score.visual > 0) {
    reasons.push(t.reasonMovement(riskLevel(recipe.movement_level)));
  }

  if (recipe.cone !== null && (c.cone === null || recipe.cone === c.cone)) reasons.push(`Cone ${recipe.cone}`);

  const total = new Set(recipe.layers.map((l) => l.glaze_id)).size;
  if (owned > 0) reasons.push(owned === total ? t.reasonOwnAll(total) : t.reasonOwnSome(owned, total));

  return reasons.slice(0, 5);
}

export function buildWarnings(recipe: RecipeSummary): string[] {
  const warnings: string[] = [];
  if ((recipe.run_risk ?? 0) >= ENGINE_CONFIG.highRunRisk - 1 || (recipe.movement_level ?? 0) >= ENGINE_CONFIG.highRunRisk) {
    warnings.push(copy.safety.runWarning);
  }
  return warnings;
}
