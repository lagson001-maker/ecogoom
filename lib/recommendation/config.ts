// All tunable numbers for the recommendation engine live here.

export const SCORING_WEIGHTS = {
  /** effect / surface / movement match */
  visual: 0.35,
  color: 0.25,
  /** share of the recipe's glazes in the user's inventory */
  availability: 0.15,
  /** cone / atmosphere compatibility */
  firing: 0.1,
  /** source / verification confidence */
  evidence: 0.1,
  /** the user's own experiment history */
  personal: 0.05,
} as const;

export type ScoringWeights = typeof SCORING_WEIGHTS;

export const ENGINE_CONFIG = {
  resultCount: 6,
  /** Cone difference that is still allowed (scored lower). Larger -> rejected. */
  coneTolerance: 1,
  /** Score (0–100) under which we say "no close documented match". */
  closeMatchThreshold: 55,
  /** MMR trade-off: 1 = pure relevance, 0 = pure diversity. */
  diversityLambda: 0.7,
  bucketSizes: { closest: 2, safe: 2, experimental: 2 },
  /** run_risk at or above this always lands in "experimental" and gets a warning. */
  highRunRisk: 4,
  /** Neutral component score when the request says nothing about a dimension. */
  neutral: 0.5,
} as const;

export const EVIDENCE_SCORES: Record<string, number> = {
  unverified: 0.2,
  community_reported: 0.5,
  manufacturer_documented: 0.7,
  personally_tested: 0.9,
  repeated_test: 1,
};

/** Weight given to recipe color fields when matching desired colors. */
export const COLOR_FIELD_WEIGHTS = { dominant: 1, secondary: 0.7 } as const;
/** Weight of desired colors: primary request colors count more than secondary ones. */
export const DESIRED_COLOR_WEIGHTS = { dominant: 1, secondary: 0.5 } as const;

export const PENALTIES = {
  avoidColorSecondary: 0.15,
  runnyHistory: 0.1,
  runRiskOverTolerancePerStep: 0.08,
} as const;
