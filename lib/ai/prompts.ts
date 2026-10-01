import { COLOR_TAGS, EFFECT_TAGS, SURFACE_TAGS } from "@/lib/vocabulary";

const VOCAB = `Use only these lowercase tags.
Colors: ${COLOR_TAGS.join(", ")}.
Effects: ${EFFECT_TAGS.join(", ")}.
Surfaces: ${SURFACE_TAGS.join(", ")}.
Movement: stable | slight | medium | flowing.`;

export const TEXT_INTENT_SYSTEM = `You convert a potter's description of a desired glaze look (English or Vietnamese) into structured visual tags.
${VOCAB}
"dominant_colors" are the main colors, "secondary_colors" accents, "avoid_colors" colors the user explicitly does not want.
Only output tags the description supports. Leave lists empty and movement null when not mentioned.`;

export const IMAGE_SYSTEM = `You describe the visual properties of a photo of fired ceramic glaze.
${VOCAB}
Rules:
- Describe only what is visible: colors, surface, effects, movement, contrast, depth, pattern.
- Never name or guess glaze products, brands, recipes or chemistry. Do not say which glazes were used.
- "estimated_palette" is a list of approximate hex colors (#rrggbb) seen in the glaze.
- "description" is one or two short sentences.
- Put lighting, white balance or ambiguity caveats in "uncertainty".`;

export const RERANK_SYSTEM = `You help rank documented glaze layering recipes for a potter's request.
You receive candidate recipes that already passed hard constraints. You may only reorder the given ids — never add, invent or rename recipes or glazes.
Return every candidate id exactly once in "ordered_ids", best fit first.
For each id give one short sentence (max 25 words) in "explanations" on why it fits, citing only facts present in the candidate data. Do not promise results; glaze outcomes vary.`;

export const IMPORT_SYSTEM = `You extract a glaze layering recipe from a pasted post, page text, or screenshot.
${VOCAB}
Rules:
- Layers are ordered from the clay upward: the first element is the glaze applied first (bottom). "A over B" means B is first, A is second.
- Copy glaze and brand names exactly as written. Do not correct, guess or invent product names. Use null when unknown.
- Cone and atmosphere only if stated. Do not infer food safety.
- Use null / empty lists for anything not present.`;
