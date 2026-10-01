import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { VerificationBadge } from "@/features/recipes/badges";
import { listSources } from "@/lib/data/sources";
import { getCopy } from "@/lib/i18n/server";
import { vocab } from "@/lib/vocabulary";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.sources.title };
}

export default async function SourcesPage() {
  const copy = await getCopy();
  const sources = await listSources();
  return (
    <>
      <PageHeader title={copy.sources.title} subtitle={copy.sources.subtitle} />
      {sources.length === 0 ? (
        <EmptyState title={copy.sources.empty} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {sources.map((s) => (
            <li key={s.id}>
              <Link href={`/sources/${s.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[s.author, s.url, s.source_date && formatDate(s.source_date)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{vocab(copy).SOURCE_TYPES[s.source_type]}</Badge>
                  <VerificationBadge status={s.evidence_level} short />
                  <span className="text-xs text-muted">{copy.sources.recipeCount(s.recipe_count)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
