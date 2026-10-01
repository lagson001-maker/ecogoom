import type { ImageVisualAnalysis, VisualIntent } from "@/types/recommendation";
import type { ImportExtractionOutput, RerankOutput } from "./schemas";

export interface RerankInput {
  request: string;
  intent: VisualIntent;
  candidates: { id: string; title: string; stack: string; tags: string[]; reasons: string[] }[];
}

export interface ReferenceImage {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

/**
 * Provider-agnostic AI surface. Implementations must:
 *   - return only structured data validated against lib/ai/schemas.ts
 *   - never name glaze products from images (visual properties only)
 *   - never introduce recipe ids that were not in the input (rerank)
 */
export interface AIProvider {
  readonly name: string;
  analyzeTextIntent(text: string): Promise<Omit<VisualIntent, "unmatched_terms">>;
  analyzeReferenceImage(image: ReferenceImage, note?: string): Promise<ImageVisualAnalysis>;
  rerankRecommendations(input: RerankInput): Promise<RerankOutput>;
  extractImport(input: { text?: string | null; url?: string | null; image?: ReferenceImage | null }): Promise<ImportExtractionOutput>;
}
