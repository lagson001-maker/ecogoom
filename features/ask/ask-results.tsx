import { Info, SearchX } from "lucide-react";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import { ResultCard } from "./result-card";
import { copy } from "@/lib/i18n";
import { humanizeTag } from "@/lib/vocabulary";
import type { AskOutcome } from "@/lib/ask/service";
import type { ImageVisualAnalysis, RecommendationBucket } from "@/types/recommendation";

const BUCKETS: RecommendationBucket[] = ["closest", "safe", "experimental"];

export function AskResults({ outcome }: { outcome: AskOutcome }) {
  const { result, imageAnalysis, aiNotes, notices } = outcome;
  const { intent } = result;
  const understood = [
    ...intent.dominant_colors,
    ...intent.secondary_colors,
    ...intent.surface,
    ...intent.effect_tags,
    ...(intent.movement ? [`${intent.movement} movement`] : []),
  ];

  return (
    <section aria-label="Recommendations" className="mt-8 space-y-6">
      {notices.map((n) => (
        <Alert key={n} icon={<Info className="h-4 w-4" />}>
          {n}
        </Alert>
      ))}

      {imageAnalysis && <ImageInterpretation analysis={imageAnalysis} />}

      {understood.length > 0 && (
        <p className="text-sm text-ink-soft">
          {copy.discover.interpretedAs}:{" "}
          {Array.from(new Set(understood)).map(humanizeTag).join(", ")}
          {intent.avoid_colors.length > 0 && <> · avoid: {intent.avoid_colors.join(", ")}</>}
        </p>
      )}

      {result.candidates.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-8 w-8" />}
          title={copy.ask.noCloseMatch}
          description={`${copy.ask.rejected(result.rejectedCount)} Try relaxing cone, glaze count or “Only My Glazes”.`}
        />
      ) : (
        <>
          {result.noCloseMatch && (
            <Alert tone="warn" title={copy.ask.noCloseMatch}>
              {copy.ask.noCloseMatchHint}
            </Alert>
          )}
          {BUCKETS.map((bucket) => {
            const items = result.candidates.filter((c) => c.bucket === bucket);
            if (items.length === 0) return null;
            return (
              <div key={bucket}>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold">
                  {copy.ask.buckets[bucket]}
                  {bucket === "experimental" && <Badge tone="warn">higher risk / less evidence</Badge>}
                </h2>
                <div className="grid gap-3 xl:grid-cols-2">
                  {items.map((c) => (
                    <ResultCard key={c.recipe.id} candidate={c} aiNote={aiNotes[c.recipe.id]} />
                  ))}
                </div>
              </div>
            );
          })}
          {result.rejectedCount > 0 && <p className="text-sm text-muted">{copy.ask.rejected(result.rejectedCount)}</p>}
          <p className="text-xs text-muted">{copy.safety.notGuaranteed}</p>
        </>
      )}
    </section>
  );
}

function ImageInterpretation({ analysis }: { analysis: ImageVisualAnalysis }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h2 className="font-serif text-lg font-semibold">{copy.ask.imageInterpretation}</h2>
      {analysis.estimated_palette.length > 0 && (
        <div className="mt-2 flex gap-1" aria-label="Estimated palette">
          {analysis.estimated_palette.slice(0, 8).map((hex, i) => (
            <span
              key={`${hex}-${i}`}
              className="h-8 w-8 rounded-md border border-black/10"
              style={{ background: /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ccc" }}
              title={hex}
            />
          ))}
        </div>
      )}
      <p className="mt-2 text-sm text-ink-soft">{analysis.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[...analysis.dominant_colors, ...analysis.secondary_colors, ...analysis.surface, ...analysis.effect_tags].map((tag, i) => (
          <Badge key={`${tag}-${i}`}>{humanizeTag(tag)}</Badge>
        ))}
        <Badge>{analysis.movement} movement</Badge>
        <Badge>{analysis.contrast} contrast</Badge>
      </div>
      {analysis.uncertainty.length > 0 && (
        <p className="mt-2 text-xs text-muted">Uncertain: {analysis.uncertainty.join("; ")}</p>
      )}
      <p className="mt-2 text-xs font-medium text-warn">{copy.ask.imageDisclaimer}</p>
    </div>
  );
}
