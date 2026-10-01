import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Heart, Star, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { MiniStack, TileIllustration } from "@/features/recipes/stack";
import { getCopy } from "@/lib/i18n/server";
import { vocab } from "@/lib/vocabulary";
import { formatDate } from "@/lib/utils";
import type { ExperimentWithLayers, SuccessLevel } from "@/types/domain";

export async function Rating({ value }: { value: number | null }) {
  if (!value) return null;
  const copy = await getCopy();
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-ink" aria-label={copy.lab.rated(value)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < value ? "fill-clay text-clay" : "text-line-strong"}`} aria-hidden />
      ))}
    </span>
  );
}

export async function SuccessBadge({ level }: { level: SuccessLevel | null }) {
  if (!level) return null;
  const { SUCCESS_LEVELS } = vocab(await getCopy());
  const icon =
    level === "success" ? (
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
    ) : level === "failure" ? (
      <XCircle className="h-3.5 w-3.5" aria-hidden />
    ) : (
      <CircleDashed className="h-3.5 w-3.5" aria-hidden />
    );
  return (
    <Badge tone={level === "success" ? "ok" : level === "failure" ? "danger" : "warn"} icon={icon}>
      {SUCCESS_LEVELS[level]}
    </Badge>
  );
}

export async function ExperimentCard({ experiment }: { experiment: ExperimentWithLayers }) {
  const copy = await getCopy();
  const v = vocab(copy);
  const photo = experiment.photos[0];
  return (
    <article className="relative flex gap-3 overflow-hidden rounded-card border border-line bg-surface p-3 shadow-sm hover:shadow-md">
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {photo ? (
          <Image src={photo.url} alt={photo.alt_text ?? copy.lab.resultOf(experiment.title)} fill sizes="96px" className="object-cover" />
        ) : experiment.layers.length ? (
          <TileIllustration layers={experiment.layers} className="h-full w-full" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="font-serif font-semibold leading-snug text-ink">
          <Link href={`/lab/${experiment.id}`} className="after:absolute after:inset-0">
            {experiment.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          {experiment.test_date && <span>{formatDate(experiment.test_date)}</span>}
          {experiment.cone !== null && <span className="font-medium text-ink">{v.coneValue(experiment.cone)}</span>}
          <Badge>{v.EXPERIMENT_STATUS[experiment.status]}</Badge>
          {experiment.favorite && <Heart className="h-3.5 w-3.5 fill-clay text-clay" aria-label={copy.inventory.favorite} />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Rating value={experiment.rating} />
          <SuccessBadge level={experiment.success_level} />
        </div>
        {experiment.layers.length > 0 && <MiniStack layers={experiment.layers} />}
        {experiment.result_tags.length > 0 && (
          <p className="text-xs text-muted">{v.tags(experiment.result_tags.slice(0, 4), " · ")}</p>
        )}
      </div>
    </article>
  );
}
