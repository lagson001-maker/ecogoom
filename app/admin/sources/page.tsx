import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/features/admin/action-form";
import { saveSource } from "@/features/admin/actions";
import { listSources } from "@/lib/data/sources";
import { copy } from "@/lib/i18n";
import { SOURCE_TYPES, VERIFICATION } from "@/lib/vocabulary";
import type { Source } from "@/types/domain";

export const metadata: Metadata = { title: copy.admin.sources };

function SourceFields({ source }: { source?: Source }) {
  const p = source?.id ?? "new";
  return (
    <>
      {source && <input type="hidden" name="id" value={source.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${p}-n`}>
          <Input id={`${p}-n`} name="name" defaultValue={source?.name} required />
        </Field>
        <Field label="URL" htmlFor={`${p}-u`}>
          <Input id={`${p}-u`} name="url" type="url" defaultValue={source?.url ?? ""} />
        </Field>
        <Field label="Author" htmlFor={`${p}-a`}>
          <Input id={`${p}-a`} name="author" defaultValue={source?.author ?? ""} />
        </Field>
        <Field label="Source date" htmlFor={`${p}-d`}>
          <Input id={`${p}-d`} name="source_date" type="date" defaultValue={source?.source_date ?? ""} />
        </Field>
        <Field label="Type" htmlFor={`${p}-t`}>
          <Select id={`${p}-t`} name="source_type" defaultValue={source?.source_type ?? "community"}>
            {Object.entries(SOURCE_TYPES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Evidence level" htmlFor={`${p}-e`}>
          <Select id={`${p}-e`} name="evidence_level" defaultValue={source?.evidence_level ?? "unverified"}>
            {Object.entries(VERIFICATION).map(([v, l]) => (
              <option key={v} value={v}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor={`${p}-notes`}>
        <Textarea id={`${p}-notes`} name="notes" defaultValue={source?.notes ?? ""} rows={2} />
      </Field>
    </>
  );
}

export default async function AdminSourcesPage() {
  const sources = await listSources();
  return (
    <>
      <PageHeader title={copy.admin.sources} subtitle="Provenance records. Every community recipe should point to one." />
      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-serif text-lg font-semibold">Add source</h2>
        <ActionForm action={saveSource} submitLabel="Add source">
          <SourceFields />
        </ActionForm>
      </Card>
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id}>
            <details className="rounded-card border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted">{s.recipe_count} recipes</span>
              </summary>
              <div className="border-t border-line p-4">
                <ActionForm action={saveSource}>
                  <SourceFields source={s} />
                </ActionForm>
                <Link href={`/sources/${s.id}`} className="mt-3 inline-block text-sm text-glaze hover:underline">
                  View recipes from this source
                </Link>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
