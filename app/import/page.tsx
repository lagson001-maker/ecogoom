import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, Section } from "@/components/ui/primitives";
import { ImportForm } from "@/features/imports/import-form";
import { requireUser } from "@/lib/data/auth";
import { listImportDrafts } from "@/lib/data/sources";
import { isAIConfigured } from "@/lib/ai";
import { copy } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: copy.import.title };

export default async function ImportPage() {
  const viewer = await requireUser("/import");
  const drafts = await listImportDrafts(viewer.userId);
  const open = drafts.filter((d) => d.status === "draft");
  const done = drafts.filter((d) => d.status !== "draft").slice(0, 20);

  return (
    <div className="max-w-3xl">
      <PageHeader title={copy.import.title} subtitle={copy.import.subtitle} />
      <Card className="p-4 sm:p-5">
        <ImportForm userId={viewer.userId} aiConfigured={isAIConfigured()} />
      </Card>
      <p className="mt-3 text-xs text-muted">
        Only import content you can access publicly or that was shared with you. Keep the original link so the provenance is never lost.
      </p>

      {open.length > 0 && (
        <Section title={`Waiting for review (${open.length})`}>
          <DraftList drafts={open} />
        </Section>
      )}
      {done.length > 0 && (
        <Section title="History">
          <DraftList drafts={done} />
        </Section>
      )}
    </div>
  );
}

function DraftList({ drafts }: { drafts: Awaited<ReturnType<typeof listImportDrafts>> }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {drafts.map((d) => (
        <li key={d.id}>
          <Link href={`/import/${d.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {d.extracted?.title ?? d.source_name ?? d.source_url ?? d.raw_text?.slice(0, 60) ?? "Screenshot import"}
              </span>
              <span className="text-xs text-muted">{formatDate(d.created_at)}</span>
            </span>
            <Badge tone={d.status === "approved" ? "ok" : d.status === "discarded" ? "neutral" : "warn"}>{d.status}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
