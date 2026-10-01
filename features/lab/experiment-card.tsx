import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Heart, Star, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { MiniStack, TileIllustration } from "@/features/recipes/stack";
import { EXPERIMENT_STATUS, SUCCESS_LEVELS, humanizeTag } from "@/lib/vocabulary";
import { formatDate } from "@/lib/utils";
import type { ExperimentWithLayers, SuccessLevel } from "@/types/domain";

export function Rating({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-ink" aria-label={`Rated ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < value ? "fill-clay text-clay" : "text-line-strong"}`} aria-hidden />
      ))}
    </span>
  );
}

export function SuccessBadge({ level }: { level: SuccessLevel | null }) {
  if (!level) return null;
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

export function ExperimentCard({ experiment }: { experiment: ExperimentWithLayers }) {
  const photo = experiment.photos[0];
  return (
    <article className="relative flex gap-3 overflow-hidden rounded-card border border-line bg-surface p-3 shadow-sm hover:shadow-md">
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {photo ? (
          <Image src={photo.url} alt={photo.alt_text ?? `Result of ${experiment.title}`} fill sizes="96px" className="object-cover" />
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
          {experiment.cone !== null && <span className="font-medium text-ink">Cone {experiment.cone}</span>}
          <Badge>{EXPERIMENT_STATUS[experiment.status]}</Badge>
          {experiment.favorite && <Heart className="h-3.5 w-3.5 fill-clay text-clay" aria-label="Favorite" />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Rating value={experiment.rating} />
          <SuccessBadge level={experiment.success_level} />
        </div>
        {experiment.layers.length > 0 && <MiniStack layers={experiment.layers} />}
        {experiment.result_tags.length > 0 && (
          <p className="text-xs text-muted">{experiment.result_tags.slice(0, 4).map(humanizeTag).join(" · ")}</p>
        )}
      </div>
    </article>
  );
}
