import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/features/admin/action-form";
import { saveBrand, saveSeries } from "@/features/admin/actions";
import { listBrands, listSeries } from "@/lib/data/catalog";
import { copy } from "@/lib/i18n";
import type { Brand } from "@/types/domain";

export const metadata: Metadata = { title: copy.admin.brands };

function BrandFields({ brand }: { brand?: Brand }) {
  const p = brand?.id ?? "new";
  return (
    <>
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${p}-name`}>
          <Input id={`${p}-name`} name="name" defaultValue={brand?.name} required />
        </Field>
        <Field label="Slug" htmlFor={`${p}-slug`} hint="Auto from name if empty.">
          <Input id={`${p}-slug`} name="slug" defaultValue={brand?.slug} />
        </Field>
        <Field label="Website" htmlFor={`${p}-web`}>
          <Input id={`${p}-web`} name="website_url" type="url" defaultValue={brand?.website_url ?? ""} />
        </Field>
        <Field label="Country" htmlFor={`${p}-country`}>
          <Input id={`${p}-country`} name="country" defaultValue={brand?.country ?? ""} />
        </Field>
      </div>
      <Field label="Description" htmlFor={`${p}-desc`}>
        <Textarea id={`${p}-desc`} name="description" defaultValue={brand?.description ?? ""} rows={2} />
      </Field>
      {brand && <Checkbox name="active" label="Active" defaultChecked={brand.active} />}
    </>
  );
}

export default async function AdminBrandsPage() {
  const [brands, series] = await Promise.all([listBrands(true), listSeries()]);
  return (
    <>
      <PageHeader title={copy.admin.brands} subtitle="Brands are data, not code: add any manufacturer or local studio." />
      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-serif text-lg font-semibold">Add brand</h2>
        <ActionForm action={saveBrand} submitLabel="Add brand">
          <BrandFields />
        </ActionForm>
      </Card>

      <ul className="space-y-3">
        {brands.map((b) => (
          <li key={b.id}>
            <details className="rounded-card border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4">
                <span className="font-medium">
                  {b.name} {!b.active && <span className="text-xs text-muted">(inactive)</span>}
                </span>
                <span className="text-xs text-muted">
                  {series.filter((s) => s.brand_id === b.id).map((s) => s.name).join(", ") || "no series"}
                </span>
              </summary>
              <div className="grid gap-6 border-t border-line p-4 lg:grid-cols-2">
                <ActionForm action={saveBrand}>
                  <BrandFields brand={b} />
                </ActionForm>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Series / product lines</h3>
                  <ul className="mb-3 flex flex-wrap gap-1.5">
                    {series
                      .filter((s) => s.brand_id === b.id)
                      .map((s) => (
                        <li key={s.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                          {s.name}
                        </li>
                      ))}
                  </ul>
                  <ActionForm action={saveSeries} submitLabel="Add series" className="flex flex-col gap-2">
                    <input type="hidden" name="brand_id" value={b.id} />
                    <Input name="name" placeholder="Series name" aria-label="New series name" required />
                  </ActionForm>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
