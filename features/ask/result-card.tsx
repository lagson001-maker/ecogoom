"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { RiskBadge, VerificationBadge } from "@/features/recipes/badges";
import { RecipeVisual } from "@/features/recipes/recipe-card";
import { MiniStack } from "@/features/recipes/stack";
import { useCopy } from "@/lib/i18n/client";
import { vocab } from "@/lib/vocabulary";
import type { RecommendationCandidate } from "@/types/recommendation";

export function ResultCard({ candidate, aiNote }: { candidate: RecommendationCandidate; aiNote?: string }) {
  const copy = useCopy();
  const { recipe, reasons, warnings, score } = candidate;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sm sm:flex-row">
      <div className="relative aspect-[4/3] shrink-0 bg-surface-2 sm:aspect-auto sm:w-44">
        <RecipeVisual recipe={recipe} sizes="(min-width: 640px) 176px, 100vw" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold leading-snug">
            <Link href={`/recipes/${recipe.slug}`} className="after:absolute after:inset-0">
              {recipe.title}
            </Link>
          </h3>
          <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-soft" title={copy.ask.score}>
            {Math.round(score.total)}
          </span>
        </div>
        <MiniStack layers={recipe.layers} />

        {reasons.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink">{copy.ask.whyMatch}</p>
            <ul className="mt-0.5 list-inside list-disc text-sm text-ink-soft">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {aiNote && (
          <p className="flex gap-1.5 rounded-lg bg-glaze-soft px-2.5 py-1.5 text-sm text-glaze">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="sr-only">{copy.evidence.ai}: </span>
              {aiNote}
            </span>
          </p>
        )}

        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted">{copy.ask.evidence}:</span>
          <VerificationBadge status={recipe.verification_status} />
          <RiskBadge label={copy.recipe.runRisk} value={recipe.run_risk} />
          {recipe.cone !== null && <span className="text-xs font-medium text-ink">{vocab(copy).coneValue(recipe.cone)}</span>}
        </div>
        {warnings.map((w) => (
          <p key={w} className="flex gap-1.5 text-xs text-warn">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {w}
          </p>
        ))}
      </div>
    </article>
  );
}
