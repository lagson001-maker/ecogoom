import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { IMAGE_SYSTEM, IMPORT_SYSTEM, RERANK_SYSTEM, TEXT_INTENT_SYSTEM } from "./prompts";
import { ImageAnalysisSchema, ImportExtractionSchema, RerankSchema, TextIntentSchema } from "./schemas";
import type { AIProvider, ReferenceImage, RerankInput } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

/** Thrown when the model declines or returns nothing parseable. */
export class AIResponseError extends Error {}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string = DEFAULT_ANTHROPIC_MODEL,
  ) {
    // Serverless functions have short limits; fail fast and fall back to
    // deterministic matching rather than hang the request.
    this.client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 });
  }

  private async structured<S extends z.ZodType>(
    schema: S,
    system: string,
    content: Anthropic.Beta.BetaContentBlockParam[],
  ): Promise<z.infer<S>> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      // Short extraction tasks: low effort keeps latency inside serverless limits.
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      // On a safety decline, let the API re-run on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") throw new AIResponseError("The AI model declined this request.");
    if (response.parsed_output == null) throw new AIResponseError("The AI response could not be parsed.");
    return response.parsed_output as z.infer<S>;
  }

  private imageBlock(image: ReferenceImage): Anthropic.Beta.BetaContentBlockParam {
    return { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } };
  }

  async analyzeTextIntent(text: string) {
    return this.structured(TextIntentSchema, TEXT_INTENT_SYSTEM, [{ type: "text", text }]);
  }

  async analyzeReferenceImage(image: ReferenceImage, note?: string) {
    return this.structured(ImageAnalysisSchema, IMAGE_SYSTEM, [
      this.imageBlock(image),
      { type: "text", text: note ? `Context from the user: ${note}` : "Describe the glaze surface in this photo." },
    ]);
  }

  async rerankRecommendations(input: RerankInput) {
    return this.structured(RerankSchema, RERANK_SYSTEM, [
      {
        type: "text",
        text: JSON.stringify({ request: input.request, intent: input.intent, candidates: input.candidates }),
      },
    ]);
  }

  async extractImport(input: { text?: string | null; url?: string | null; image?: ReferenceImage | null }) {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (input.image) content.push(this.imageBlock(input.image));
    const parts = [input.url ? `Source URL: ${input.url}` : null, input.text ? `Text:\n${input.text}` : null].filter(Boolean);
    content.push({ type: "text", text: parts.length ? parts.join("\n\n") : "Extract the recipe from the image." });
    return this.structured(ImportExtractionSchema, IMPORT_SYSTEM, content);
  }
}
