import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Alert, Badge, Card, Fact, PageHeader, Section } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ExperimentForm } from "@/features/lab/experiment-form";
import { Rating, SuccessBadge } from "@/features/lab/experiment-card";
import { deleteExperiment, promoteExperiment, setExperimentStatus } from "@/features/lab/actions";
import { LayerStack } from "@/features/recipes/stack";
import { LevelMeter } from "@/features/recipes/badges";
import { ImageUpload } from "@/features/media/image-upload";
import { MediaGallery } from "@/features/media/media-gallery";
import { requireUser } from "@/lib/data/auth";
import { getGlazeOptions } from "@/lib/data/catalog";
import { getExperiment } from "@/lib/data/personal";
import { isUuid } from "@/lib/forms";
import { BUCKETS } from "@/lib/storage";
import { copy } from "@/lib/i18n";
import { ATMOSPHERES, CLAY_COLORS, EXPERIMENT_STATUS, humanizeTag } from "@/lib/vocabulary";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: copy.lab.title };

export default async function ExperimentPage({ params, searchParams }: PageProps<"/lab/[id]">) {
  const { id } = await params;
  const editing = (await searchParams).edit === "1";
  const viewer = await requireUser(`/lab/${id}`);
  if (!isUuid(id)) notFound();
  const experiment = await getExperiment(id);
  if (!experiment) notFound();

  if (editing) {
    const glazes = await getGlazeOptions();
    return (
      <>
        <PageHeader title={experiment.title} subtitle={copy.common.edit} />
        <ExperimentForm experiment={experiment} glazes={glazes} />
      </>
    );
  }

  const e = experiment;
  const next = e.status === "in_progress" ? "waiting_firing" : e.status === "waiting_firing" ? "completed" : null;
  const path = `/lab/${e.id}`;

  return (
    <>
      <PageHeader
        title={e.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{EXPERIMENT_STATUS[e.status]}</Badge>
            {e.test_date && <span>{formatDate(e.test_date)}</span>}
            <Rating value={e.rating} />
            <SuccessBadge level={e.success_level} />
          </span>
        }
        actions={
          <>
            <LinkButton href={`${path}?edit=1`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {e.status === "completed" ? copy.common.edit : "Edit / log result"}
            </LinkButton>
            {next && (
              <form action={setExperimentStatus.bind(null, e.id, next)}>
                <SubmitButton variant="outline">Mark: {EXPERIMENT_STATUS[next]}</SubmitButton>
              </form>
            )}
          </>
        }
      />

      {e.recipe && (
        <p className="-mt-3 mb-4 text-sm text-ink-soft">
          {copy.lab.basedOn}{" "}
          <Link href={`/recipes/${e.recipe.slug}`} className="font-medium text-glaze hover:underline">
            {e.recipe.title}
          </Link>
        </p>
      )}

      <div className="grid gap-x-10 gap-y-2 lg:grid-cols-2">
        <div>
          <Section title="Result photos" className="mt-0">
            <div className="space-y-3">
              <MediaGallery media={e.photos} canEdit revalidate={path} />
              <ImageUpload
                ownerType="experiment"
                ownerId={e.id}
                bucket={BUCKETS.private}
                folder={`${viewer.userId}/experiments/${e.id}`}
                revalidate={path}
              />
            </div>
          </Section>

          {(e.result_notes || e.result_tags.length > 0) && (
            <Section title={copy.recipe.result}>
              {e.result_notes && <p className="leading-relaxed text-ink-soft">{e.result_notes}</p>}
              {e.result_tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.result_tags.map((tag) => (
                    <Badge key={tag} tone={tag === "too_runny" ? "warn" : "neutral"}>
                      {humanizeTag(tag)}
                    </Badge>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>

        <div>
          <Section title={copy.recipe.stackTitle} className="mt-0">
            {e.layers.length ? (
              <LayerStack layers={e.layers} clay={e.clay_body} />
            ) : (
              <Alert>No layers yet. Edit the test to add glazes.</Alert>
            )}
          </Section>

          <Section title={copy.recipe.firing}>
            <Card className="px-4 py-1">
              <dl>
                <Fact label={copy.recipe.cone}>{e.cone ?? copy.common.unknown}</Fact>
                <Fact label={copy.recipe.atmosphere}>
                  {ATMOSPHERES.find((a) => a.value === e.atmosphere)?.label ?? copy.common.unknown}
                </Fact>
                <Fact label={copy.recipe.clay}>
                  {[e.clay_body, CLAY_COLORS.find((c) => c.value === e.clay_color)?.label].filter(Boolean).join(" · ") ||
                    copy.common.unknown}
                </Fact>
                <Fact label="Observed movement">
                  <LevelMeter value={e.movement_level} label="Observed movement" />
                </Fact>
                <Fact label="Observed run risk">
                  <LevelMeter value={e.run_risk_observed} label="Observed run risk" />
                </Fact>
              </dl>
            </Card>
            {e.application_notes && <p className="mt-3 text-sm text-ink-soft"><strong>Application:</strong> {e.application_notes}</p>}
            {e.kiln_notes && <p className="mt-1 text-sm text-ink-soft"><strong>Kiln:</strong> {e.kiln_notes}</p>}
          </Section>
        </div>
      </div>

      <Section title="Next steps">
        <div className="flex flex-wrap gap-2">
          {e.promoted_recipe_id ? (
            <Badge tone="ok" icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}>
              {copy.lab.promoted}
            </Badge>
          ) : (
            <form action={promoteExperiment.bind(null, e.id)}>
              <SubmitButton variant={e.success_level === "success" ? "primary" : "outline"} disabled={e.layers.length === 0}>
                <Sparkles className="h-4 w-4" aria-hidden />
                {copy.lab.promote}
              </SubmitButton>
            </form>
          )}
          <form action={deleteExperiment.bind(null, e.id)}>
            <SubmitButton variant="ghost" className="text-danger" pendingLabel="Deleting…" confirmMessage="Delete permanently? This cannot be undone.">
              <Trash2 className="h-4 w-4" aria-hidden />
              {copy.common.delete}
            </SubmitButton>
          </form>
        </div>
      </Section>
    </>
  );
}
