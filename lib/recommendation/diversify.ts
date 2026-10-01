// Bucket + diversity selection: avoid returning six near-identical combos.

import { ENGINE_CONFIG } from "./config";
import type { RecipeSummary } from "@/types/domain";
import type { RecommendationBucket } from "@/types/recommendation";

export interface Scored {
  recipe: RecipeSummary;
  total: number;
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** 0..1 similarity across glaze set, color direction and surface effect. */
export function recipeSimilarity(a: RecipeSummary, b: RecipeSummary): number {
  const glazes = jaccard(a.layers.map((l) => l.glaze_id), b.layers.map((l) => l.glaze_id));
  const colors = jaccard([...a.dominant_colors, ...a.color_tags], [...b.dominant_colors, ...b.color_tags]);
  const effects = jaccard([...a.effect_tags, ...a.surface_tags], [...b.effect_tags, ...b.surface_tags]);
  return 0.5 * glazes + 0.3 * colors + 0.2 * effects;
}

function isExperimental(r: RecipeSummary): boolean {
  return (r.run_risk ?? 0) >= ENGINE_CONFIG.highRunRisk || (r.movement_level ?? 0) >= ENGINE_CONFIG.highRunRisk;
}

function isSafe(r: RecipeSummary): boolean {
  return r.run_risk !== null && r.run_risk <= 2 && !isExperimental(r);
}

/** Maximal Marginal Relevance pick from `pool`, given what's already chosen. */
function pickMMR(pool: Scored[], chosen: Scored[], lambda: number): Scored | null {
  let best: Scored | null = null;
  let bestValue = -Infinity;
  for (const cand of pool) {
    const maxSim = chosen.length ? Math.max(...chosen.map((c) => recipeSimilarity(c.recipe, cand.recipe))) : 0;
    const value = lambda * cand.total - (1 - lambda) * maxSim * 100;
    if (value > bestValue) {
      bestValue = value;
      best = cand;
    }
  }
  return best;
}

export function selectDiverse(
  scored: Scored[],
  count: number = ENGINE_CONFIG.resultCount,
  lambda: number = ENGINE_CONFIG.diversityLambda,
): { item: Scored; bucket: RecommendationBucket }[] {
  const remaining = [...scored].sort((a, b) => b.total - a.total);
  const chosen: { item: Scored; bucket: RecommendationBucket }[] = [];
  const take = (item: Scored, bucket: RecommendationBucket) => {
    chosen.push({ item, bucket });
    remaining.splice(remaining.indexOf(item), 1);
  };
  const chosenItems = () => chosen.map((c) => c.item);

  const plan: [RecommendationBucket, number, (r: RecipeSummary) => boolean][] = [
    ["closest", ENGINE_CONFIG.bucketSizes.closest, (r) => !isExperimental(r)],
    ["safe", ENGINE_CONFIG.bucketSizes.safe, isSafe],
    ["experimental", ENGINE_CONFIG.bucketSizes.experimental, () => true],
  ];

  for (const [bucket, size, accept] of plan) {
    for (let i = 0; i < size && chosen.length < count; i++) {
      const pool = remaining.filter((s) => accept(s.recipe));
      // "Closest" is pure relevance for the very first pick.
      const pick = bucket === "closest" && chosen.length === 0 ? pool[0] ?? null : pickMMR(pool, chosenItems(), lambda);
      if (!pick) break;
      take(pick, bucket);
    }
  }

  // Back-fill if some bucket had no eligible candidates.
  while (chosen.length < count && remaining.length > 0) {
    const pick = pickMMR(remaining, chosenItems(), lambda)!;
    take(pick, isExperimental(pick.recipe) ? "experimental" : isSafe(pick.recipe) ? "safe" : "closest");
  }

  const order: RecommendationBucket[] = ["closest", "safe", "experimental"];
  return chosen.sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket) || b.item.total - a.item.total);
}
