import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { requireEditor } from "@/lib/data/auth";
import { listImportDrafts } from "@/lib/data/sources";
import { copy } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: copy.admin.imports };

export default async function AdminImportsPage() {
  const viewer = await requireEditor();
  const drafts = await listImportDrafts(viewer.userId);
  return (
    <>
      <PageHeader title={copy.admin.imports} subtitle="Your import drafts. Each user reviews their own imports." actions={<LinkButton href="/import">{copy.nav.import}</LinkButton>} />
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {drafts.map((d) => (
          <li key={d.id}>
            <Link href={`/import/${d.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2">
              <span className="min-w-0 flex-1 truncate">{d.extracted?.title ?? d.source_name ?? d.source_url ?? "Import"}</span>
              <span className="text-xs text-muted">{formatDate(d.created_at)}</span>
              <Badge tone={d.status === "approved" ? "ok" : d.status === "draft" ? "warn" : "neutral"}>{d.status}</Badge>
            </Link>
          </li>
        ))}
        {drafts.length === 0 && <li className="px-4 py-6 text-sm text-muted">No imports yet.</li>}
      </ul>
    </>
  );
}
