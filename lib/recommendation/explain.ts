// Short, factual match reasons derived from data — never invented.

import { ENGINE_CONFIG } from "./config";
import { desiredVisualTags } from "./scoring";
import { en } from "@/lib/i18n/en";
import type { Messages } from "@/lib/i18n";
import { riskLevel, vocab } from "@/lib/vocabulary";
import type { RecipeSummary } from "@/types/domain";
import type { RecommendationConstraints, ScoreBreakdown, VisualIntent } from "@/types/recommendation";

export function buildReasons(
  recipe: RecipeSummary,
  intent: VisualIntent,
  c: RecommendationConstraints,
  score: ScoreBreakdown,
  owned: number,
  messages: Messages = en,
): string[] {
  const t = messages.recommendation;
  const v = vocab(messages);
  const reasons: string[] = [];

  const wantedColors = new Set([...intent.dominant_colors, ...intent.secondary_colors, ...c.preferredColors]);
  const colorHits = [...recipe.dominant_colors, ...recipe.color_tags].filter((x) => wantedColors.has(x));
  if (colorHits.length) reasons.push(t.reasonPalette(Array.from(new Set(colorHits)).slice(0, 3).map(v.tag).join(" / ")));

  const wantedEffects = new Set(desiredVisualTags(intent, c));
  const effectHits = [...recipe.effect_tags, ...recipe.surface_tags].filter((x) => wantedEffects.has(x));
  if (effectHits.length) reasons.push(Array.from(new Set(effectHits)).slice(0, 3).map(v.tag).join(", "));

  if ((c.movement ?? intent.movement) && recipe.movement_level !== null && score.visual > 0) {
    reasons.push(t.reasonMovement(v.riskLevel(riskLevel(recipe.movement_level))));
  }

  if (recipe.cone !== null && (c.cone === null || recipe.cone === c.cone)) reasons.push(v.coneValue(recipe.cone));

  const total = new Set(recipe.layers.map((l) => l.glaze_id)).size;
  if (owned > 0) reasons.push(owned === total ? t.reasonOwnAll(total) : t.reasonOwnSome(owned, total));

  return reasons.slice(0, 5);
}

export function buildWarnings(recipe: RecipeSummary, messages: Messages = en): string[] {
  const warnings: string[] = [];
  if ((recipe.run_risk ?? 0) >= ENGINE_CONFIG.highRunRisk - 1 || (recipe.movement_level ?? 0) >= ENGINE_CONFIG.highRunRisk) {
    warnings.push(messages.safety.runWarning);
  }
  return warnings;
}
