// Pipeline: normalized intent -> hard filter -> score -> diversify -> explain.
// Pure function over data already loaded from the database. Optional AI
// reranking happens afterwards (lib/ai) and may only reorder these candidates.

import { ENGINE_CONFIG } from "./config";
import { buildReasons, buildWarnings } from "./explain";
import { applyHardFilters } from "./filters";
import { intentHasSignals } from "./intent";
import { scoreRecipe } from "./scoring";
import { selectDiverse } from "./diversify";
import type { RecipeSummary } from "@/types/domain";
import type {
  PersonalContext,
  RecommendationCandidate,
  RecommendationRequest,
  RecommendationResult,
} from "@/types/recommendation";

export function emptyPersonalContext(): PersonalContext {
  return { inventoryGlazeIds: new Set(), testedRecipeRatings: new Map(), runnyGlazeIds: new Set() };
}

export function recommend(
  recipes: RecipeSummary[],
  request: RecommendationRequest,
  personal: PersonalContext = emptyPersonalContext(),
  count: number = ENGINE_CONFIG.resultCount,
): RecommendationResult {
  const { intent, constraints } = request;
  const { passed, rejected } = applyHardFilters(recipes, constraints, personal);

  const scored = passed.map((recipe) => {
    const { breakdown, owned } = scoreRecipe(recipe, intent, constraints, personal);
    return { recipe, breakdown, owned, total: breakdown.total };
  });
  const byId = new Map(scored.map((s) => [s.recipe.id, s]));

  const selected = selectDiverse(scored, count);

  const candidates: RecommendationCandidate[] = selected.map(({ item, bucket }) => {
    const s = byId.get(item.recipe.id)!;
    return {
      recipe: s.recipe,
      score: s.breakdown,
      bucket,
      reasons: buildReasons(s.recipe, intent, constraints, s.breakdown, s.owned),
      warnings: buildWarnings(s.recipe),
      ownedGlazeCount: s.owned,
    };
  });

  const best = Math.max(0, ...candidates.map((c) => c.score.total));
  const hasSignals = intentHasSignals(intent) || constraints.preferredColors.length > 0 || constraints.desiredSurface.length > 0;

  return {
    candidates,
    noCloseMatch: candidates.length === 0 || (hasSignals && best < ENGINE_CONFIG.closeMatchThreshold),
    rejectedCount: rejected.length,
    intent,
    aiExplanation: null,
  };
}
