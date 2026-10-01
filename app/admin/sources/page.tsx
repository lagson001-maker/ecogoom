import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/features/admin/action-form";
import { saveSource } from "@/features/admin/actions";
import { listSources } from "@/lib/data/sources";
import { getCopy } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";
import { vocab } from "@/lib/vocabulary";
import type { Source } from "@/types/domain";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.admin.sources };
}

function SourceFields({ source, copy }: { source?: Source; copy: Messages }) {
  const { SOURCE_TYPES, VERIFICATION } = vocab(copy);
  const p = source?.id ?? "new";
  return (
    <>
      {source && <input type="hidden" name="id" value={source.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={copy.admin.name} htmlFor={`${p}-n`}>
          <Input id={`${p}-n`} name="name" defaultValue={source?.name} required />
        </Field>
        <Field label="URL" htmlFor={`${p}-u`}>
          <Input id={`${p}-u`} name="url" type="url" defaultValue={source?.url ?? ""} />
        </Field>
        <Field label={copy.import.author} htmlFor={`${p}-a`}>
          <Input id={`${p}-a`} name="author" defaultValue={source?.author ?? ""} />
        </Field>
        <Field label={copy.sources.date} htmlFor={`${p}-d`}>
          <Input id={`${p}-d`} name="source_date" type="date" defaultValue={source?.source_date ?? ""} />
        </Field>
        <Field label={copy.glaze.type} htmlFor={`${p}-t`}>
          <Select id={`${p}-t`} name="source_type" defaultValue={source?.source_type ?? "community"}>
            {Object.entries(SOURCE_TYPES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.sources.evidence} htmlFor={`${p}-e`}>
          <Select id={`${p}-e`} name="evidence_level" defaultValue={source?.evidence_level ?? "unverified"}>
            {Object.entries(VERIFICATION).map(([v, l]) => (
              <option key={v} value={v}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={copy.import.notes} htmlFor={`${p}-notes`}>
        <Textarea id={`${p}-notes`} name="notes" defaultValue={source?.notes ?? ""} rows={2} />
      </Field>
    </>
  );
}

export default async function AdminSourcesPage() {
  const copy = await getCopy();
  const sources = await listSources();
  return (
    <>
      <PageHeader title={copy.admin.sources} subtitle={copy.admin.sourcesHint} />
      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-serif text-lg font-semibold">{copy.admin.addSource}</h2>
        <ActionForm action={saveSource} submitLabel={copy.admin.addSource}>
          <SourceFields copy={copy} />
        </ActionForm>
      </Card>
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id}>
            <details className="rounded-card border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted">{copy.sources.recipeCount(s.recipe_count)}</span>
              </summary>
              <div className="border-t border-line p-4">
                <ActionForm action={saveSource}>
                  <SourceFields source={s} copy={copy} />
                </ActionForm>
                <Link href={`/sources/${s.id}`} className="mt-3 inline-block text-sm text-glaze hover:underline">
                  {copy.admin.viewSourceRecipes}
                </Link>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
