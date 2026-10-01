import type { Atmosphere, RecipeSummary } from "./domain";

export type MovementPreference = "stable" | "slight" | "medium" | "flowing";
export type RiskTolerance = "low" | "medium" | "experimental";
export type DesiredSurface = "gloss" | "matte" | "satin" | "metallic" | "crystal" | "reactive";

/** Structured visual description — produced by the text parser or image analyzer. */
export interface VisualIntent {
  dominant_colors: string[];
  secondary_colors: string[];
  surface: string[];
  effect_tags: string[];
  avoid_colors: string[];
  movement: MovementPreference | null;
  contrast?: "low" | "medium" | "high" | null;
  description?: string;
  uncertainty?: string[];
  /** Free-text terms the parser could not map to the vocabulary. */
  unmatched_terms: string[];
}

/** Output schema of the vision adapter. Visual properties only — never product names. */
export interface ImageVisualAnalysis {
  dominant_colors: string[];
  secondary_colors: string[];
  estimated_palette: string[];
  surface: string[];
  effect_tags: string[];
  contrast: "low" | "medium" | "high";
  movement: MovementPreference;
  visual_depth: "low" | "medium" | "high";
  pattern: string[];
  description: string;
  uncertainty: string[];
}

export interface RecommendationConstraints {
  /** Max distinct glaze products in the combination. null = no limit. */
  maxGlazes: number | null;
  maxLayers: number | null;
  /** Desired visible color count — informational, distinct from maxGlazes. */
  desiredColorCount: number | null;
  preferredBrandIds: string[];
  excludedBrandIds: string[];
  allowedGlazeIds: string[];
  onlyMyGlazes: boolean;
  cone: number | null;
  atmosphere: Atmosphere | null;
  /** When true, atmosphere mismatch is a hard filter. */
  atmosphereRequired: boolean;
  clayBody: string | null;
  preferredColors: string[];
  avoidColors: string[];
  desiredSurface: DesiredSurface[];
  movement: MovementPreference | null;
  riskTolerance: RiskTolerance;
}

export interface RecommendationRequest {
  text: string;
  intent: VisualIntent;
  constraints: RecommendationConstraints;
}

/** Per-user signals derived from the database (inventory + experiments). */
export interface PersonalContext {
  inventoryGlazeIds: Set<string>;
  /** recipe_id -> best rating the user gave in an experiment */
  testedRecipeRatings: Map<string, number>;
  /** glaze ids the user repeatedly marked as too runny */
  runnyGlazeIds: Set<string>;
}

export type RecommendationBucket = "closest" | "safe" | "experimental";

export interface ScoreBreakdown {
  visual: number;
  color: number;
  availability: number;
  firing: number;
  evidence: number;
  personal: number;
  penalty: number;
  total: number;
}

export interface RecommendationCandidate {
  recipe: RecipeSummary;
  score: ScoreBreakdown;
  bucket: RecommendationBucket;
  reasons: string[];
  warnings: string[];
  ownedGlazeCount: number;
}

export interface RecommendationResult {
  candidates: RecommendationCandidate[];
  /** true when nothing scored above the "close match" threshold */
  noCloseMatch: boolean;
  rejectedCount: number;
  intent: VisualIntent;
  aiExplanation: string | null;
}
