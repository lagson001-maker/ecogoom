import "server-only";
import { getAIProvider } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { getRecommendationCandidates } from "@/lib/data/recipes";
import { getPersonalContext } from "@/lib/data/personal";
import { recommend } from "@/lib/recommendation/engine";
import { emptyIntent, mergeIntents, parseTextIntent } from "@/lib/recommendation/intent";
import { COLOR_TAGS, EFFECT_TAGS, SURFACE_TAGS } from "@/lib/vocabulary";
import { getCopy } from "@/lib/i18n/server";
import type {
  ImageVisualAnalysis,
  RecommendationCandidate,
  RecommendationConstraints,
  RecommendationResult,
  VisualIntent,
} from "@/types/recommendation";

const AI_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AIImageType = (typeof AI_IMAGE_TYPES)[number];
const MAX_AI_IMAGE_BYTES = 5 * 1024 * 1024;

export interface AskInput {
  userId: string | null;
  text: string;
  imagePath: string | null;
  constraints: RecommendationConstraints;
}

export interface AskOutcome {
  result: RecommendationResult;
  imageAnalysis: ImageVisualAnalysis | null;
  /** Explanations from the AI rerank, keyed by recipe id. */
  aiNotes: Record<string, string>;
  notices: string[];
  aiConfigured: boolean;
}

const known = (vocab: readonly string[]) => (tags: string[]) =>
  Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => vocab.includes(t))));
const knownColors = known(COLOR_TAGS);
const knownEffects = known(EFFECT_TAGS);
const knownSurfaces = known(SURFACE_TAGS);

/** Keep only canonical vocabulary from AI output — the database speaks these tags. */
function sanitizeIntent(i: Partial<VisualIntent>): VisualIntent {
  return {
    ...emptyIntent(),
    dominant_colors: knownColors(i.dominant_colors ?? []),
    secondary_colors: knownColors(i.secondary_colors ?? []),
    avoid_colors: knownColors(i.avoid_colors ?? []),
    surface: knownSurfaces(i.surface ?? []),
    effect_tags: knownEffects(i.effect_tags ?? []),
    movement: i.movement ?? null,
    contrast: i.contrast ?? null,
    description: i.description,
    uncertainty: i.uncertainty,
  };
}

function imageToIntent(a: ImageVisualAnalysis): VisualIntent {
  return sanitizeIntent({
    dominant_colors: a.dominant_colors,
    secondary_colors: a.secondary_colors,
    surface: a.surface,
    effect_tags: a.effect_tags,
    movement: a.movement,
    contrast: a.contrast,
    description: a.description,
    uncertainty: a.uncertainty,
  });
}

async function loadReferenceImage(path: string): Promise<{ base64: string; mediaType: AIImageType } | { error: string }> {
  const [supabase, copy] = await Promise.all([createClient(), getCopy()]);
  // Downloaded with the user's session: Storage RLS restricts this to their own folder.
  const { data, error } = await supabase.storage.from("private-user-assets").download(path);
  if (error || !data) return { error: copy.errors.uploadFailed };
  const type = data.type as AIImageType;
  if (!AI_IMAGE_TYPES.includes(type)) return { error: copy.errors.invalidImage };
  if (data.size > MAX_AI_IMAGE_BYTES) return { error: copy.ask.imageTooLarge };
  return { base64: Buffer.from(await data.arrayBuffer()).toString("base64"), mediaType: type };
}

/** Reorder within each bucket by the AI ranking; ids not in the input are ignored. */
function applyRerank(candidates: RecommendationCandidate[], orderedIds: string[]): RecommendationCandidate[] {
  const rank = new Map<string, number>();
  orderedIds.forEach((id, i) => {
    if (!rank.has(id)) rank.set(id, i);
  });
  const buckets = ["closest", "safe", "experimental"] as const;
  return buckets.flatMap((b) =>
    candidates
      .filter((c) => c.bucket === b)
      .sort((x, y) => (rank.get(x.recipe.id) ?? 99) - (rank.get(y.recipe.id) ?? 99)),
  );
}

export async function runAsk(input: AskInput): Promise<AskOutcome> {
  const ai = getAIProvider();
  const copy = await getCopy();
  const notices: string[] = [];
  let imageAnalysis: ImageVisualAnalysis | null = null;

  // 1. Understand intent: deterministic parser always; AI on top when available.
  const parsed = parseTextIntent(input.text);
  let aiTextIntent: VisualIntent | null = null;
  if (input.text && ai) {
    try {
      aiTextIntent = sanitizeIntent(await ai.analyzeTextIntent(input.text));
    } catch {
      notices.push(copy.errors.aiFailed);
    }
  } else if (input.text && !ai) {
    notices.push(copy.ask.aiTextFallback);
  }

  if (input.imagePath) {
    if (!input.userId || !input.imagePath.startsWith(`${input.userId}/`)) {
      notices.push(copy.errors.unauthorized);
    } else if (!ai) {
      notices.push(copy.ask.aiNotConfigured);
    } else {
      const image = await loadReferenceImage(input.imagePath);
      if ("error" in image) notices.push(image.error);
      else {
        try {
          imageAnalysis = await ai.analyzeReferenceImage(image, input.text || undefined);
        } catch {
          notices.push(copy.errors.aiFailed);
        }
      }
    }
  }

  const intent = mergeIntents(aiTextIntent, parsed, imageAnalysis ? imageToIntent(imageAnalysis) : null);
  intent.unmatched_terms = parsed.unmatched_terms;

  const constraints: RecommendationConstraints = {
    ...input.constraints,
    avoidColors: Array.from(new Set([...input.constraints.avoidColors, ...intent.avoid_colors])),
  };

  // 2-5. Database candidates -> hard filter -> score -> diversify.
  const [recipes, personal] = await Promise.all([getRecommendationCandidates(), getPersonalContext(input.userId)]);
  const result = recommend(recipes, { text: input.text, intent, constraints }, personal, undefined, copy);

  // 6. Optional AI rerank/explanation. It may only reorder these ids.
  const aiNotes: Record<string, string> = {};
  if (ai && result.candidates.length > 1) {
    try {
      const ids = new Set(result.candidates.map((c) => c.recipe.id));
      const rerank = await ai.rerankRecommendations({
        request: input.text || intent.description || "",
        intent,
        candidates: result.candidates.map((c) => ({
          id: c.recipe.id,
          title: c.recipe.title,
          stack: c.recipe.layers
            .map((l) => `L${l.layer_position}: ${l.glaze.brand.name} ${l.glaze.name} x${l.coat_count} (${l.coverage_area})`)
            .join("; "),
          tags: c.recipe.all_tags,
          reasons: c.reasons,
        })),
      });
      result.candidates = applyRerank(result.candidates, rerank.ordered_ids.filter((id) => ids.has(id)));
      for (const e of rerank.explanations) if (ids.has(e.id)) aiNotes[e.id] = e.text.slice(0, 240);
    } catch {
      // Deterministic order stands.
    }
  }

  // History (also the owner row for the reference image).
  if (input.userId) {
    const supabase = await createClient();
    const { data: req } = await supabase
      .from("ask_requests")
      .insert({
        user_id: input.userId,
        query_text: input.text || null,
        constraints,
        image_path: input.imagePath,
        visual_intent: imageAnalysis ?? intent,
        result_ids: result.candidates.map((c) => c.recipe.id),
      })
      .select("id")
      .single();
    if (req && input.imagePath?.startsWith(`${input.userId}/`)) {
      await supabase.from("media_assets").insert({
        owner_type: "recommendation_reference",
        owner_id: req.id,
        bucket: "private-user-assets",
        storage_path: input.imagePath,
        created_by: input.userId,
      });
    }
  }

  return { result, imageAnalysis, aiNotes, notices, aiConfigured: Boolean(ai) };
}
