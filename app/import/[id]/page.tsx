import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Alert, Card, PageHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { ReviewForm } from "@/features/imports/review-form";
import { discardImportDraft } from "@/features/imports/actions";
import { requireUser } from "@/lib/data/auth";
import { getGlazeOptions } from "@/lib/data/catalog";
import { getImportDraft } from "@/lib/data/sources";
import { createClient } from "@/lib/supabase/server";
import { matchGlaze } from "@/lib/imports/match";
import { isUuid } from "@/lib/forms";
import { getCopy } from "@/lib/i18n/server";
import type { LayerInput } from "@/types/domain";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.import.review };
}

export default async function ReviewImportPage({ params }: PageProps<"/import/[id]">) {
  const copy = await getCopy();
  const { id } = await params;
  const viewer = await requireUser(`/import/${id}`);
  if (!isUuid(id)) notFound();
  const draft = await getImportDraft(id);
  if (!draft) notFound();

  const glazes = await getGlazeOptions();
  let screenshotUrl: string | null = null;
  if (draft.image_path) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("private-user-assets").createSignedUrl(draft.image_path, 3600);
    screenshotUrl = data?.signedUrl ?? null;
  }

  // Map AI-suggested names to real glazes. Unmatched names are surfaced, never created.
  const unmatched: string[] = [];
  const layers: LayerInput[] = [];
  for (const l of draft.extracted?.layers ?? []) {
    const match = matchGlaze(l, glazes);
    if (!match) unmatched.push([l.brand_name, l.glaze_name].filter(Boolean).join(" "));
    layers.push({
      glaze_id: match?.id ?? "",
      coat_count: Math.min(10, Math.max(1, l.coat_count ?? 1)),
      coverage_area: l.coverage_area ?? "full",
      coverage_percent: null,
      application_method: null,
      notes: match ? null : copy.import.importedAs(l.glaze_name),
    });
  }

  if (draft.status !== "draft") {
    return (
      <>
        <PageHeader title={copy.import.review} />
        <Alert title={copy.import.isStatus(copy.import.status[draft.status])}>
          {draft.recipe_id ? copy.import.recipeCreated : null}{" "}
          <Link href="/import" className="underline">
            {copy.import.backToImports}
          </Link>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={copy.import.review}
        subtitle={copy.import.reviewHint}
        actions={
          <form action={discardImportDraft.bind(null, draft.id)}>
            <SubmitButton variant="outline" confirmMessage={copy.import.confirmDiscard}>
              {copy.import.discard}
            </SubmitButton>
          </form>
        }
      />

      <Card className="mb-5 grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-semibold">{copy.import.originalInput}</p>
          {draft.source_url && (
            <a href={draft.source_url} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-glaze hover:underline">
              {draft.source_url} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          {draft.raw_text && <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-ink-soft">{draft.raw_text}</p>}
          {draft.notes && <p className="text-muted">{copy.import.notes}: {draft.notes}</p>}
        </div>
        {screenshotUrl && (
          <a href={screenshotUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={screenshotUrl} alt={copy.import.screenshotAlt} className="max-h-56 rounded-lg border border-line object-contain" />
          </a>
        )}
      </Card>

      <div className="mb-5">
        {draft.extracted ? (
          <Alert tone="glaze" icon={<Sparkles className="h-4 w-4" />}>
            {copy.import.aiSuggested}
          </Alert>
        ) : (
          <Alert>{copy.import.aiOff}</Alert>
        )}
      </div>

      <ReviewForm draft={draft} layers={layers} unmatched={unmatched} glazes={glazes} isEditor={viewer.isEditor} />
    </>
  );
}
