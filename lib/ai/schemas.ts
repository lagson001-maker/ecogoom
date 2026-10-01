// Structured-output schemas. Every AI response is validated against these
// before the app uses it.

import { z } from "zod";

const tagList = z.array(z.string());
const movement = z.enum(["stable", "slight", "medium", "flowing"]);

export const TextIntentSchema = z.object({
  dominant_colors: tagList,
  secondary_colors: tagList,
  avoid_colors: tagList,
  surface: tagList,
  effect_tags: tagList,
  movement: movement.nullable(),
});
export type TextIntentOutput = z.infer<typeof TextIntentSchema>;

export const ImageAnalysisSchema = z.object({
  dominant_colors: tagList,
  secondary_colors: tagList,
  estimated_palette: z.array(z.string()),
  surface: tagList,
  effect_tags: tagList,
  contrast: z.enum(["low", "medium", "high"]),
  movement,
  visual_depth: z.enum(["low", "medium", "high"]),
  pattern: z.array(z.string()),
  description: z.string(),
  uncertainty: z.array(z.string()),
});

export const RerankSchema = z.object({
  ordered_ids: z.array(z.string()),
  explanations: z.array(z.object({ id: z.string(), text: z.string() })),
});
export type RerankOutput = z.infer<typeof RerankSchema>;

export const ImportExtractionSchema = z.object({
  title: z.string().nullable(),
  layers: z.array(
    z.object({
      glaze_name: z.string(),
      brand_name: z.string().nullable(),
      coat_count: z.number().int().nullable(),
      coverage_area: z
        .enum(["full", "upper_half", "upper_third", "rim_only", "overlap", "brush_detail", "custom"])
        .nullable(),
    }),
  ),
  cone: z.number().int().nullable(),
  atmosphere: z.enum(["oxidation", "reduction", "neutral", "wood", "soda", "salt", "raku", "unknown"]).nullable(),
  clay_body: z.string().nullable(),
  effect_tags: tagList,
  color_tags: tagList,
  surface_tags: tagList,
  source_author: z.string().nullable(),
  source_date: z.string().nullable(),
  notes: z.string().nullable(),
});
export type ImportExtractionOutput = z.infer<typeof ImportExtractionSchema>;
