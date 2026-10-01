import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/features/admin/action-form";
import { saveBrand, saveSeries } from "@/features/admin/actions";
import { listBrands, listSeries } from "@/lib/data/catalog";
import { getCopy } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";
import type { Brand } from "@/types/domain";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.admin.brands };
}

function BrandFields({ brand, copy }: { brand?: Brand; copy: Messages }) {
  const t = copy.admin;
  const p = brand?.id ?? "new";
  return (
    <>
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.name} htmlFor={`${p}-name`}>
          <Input id={`${p}-name`} name="name" defaultValue={brand?.name} required />
        </Field>
        <Field label={t.slug} htmlFor={`${p}-slug`} hint={t.slugHint}>
          <Input id={`${p}-slug`} name="slug" defaultValue={brand?.slug} />
        </Field>
        <Field label={copy.brands.website} htmlFor={`${p}-web`}>
          <Input id={`${p}-web`} name="website_url" type="url" defaultValue={brand?.website_url ?? ""} />
        </Field>
        <Field label={t.country} htmlFor={`${p}-country`}>
          <Input id={`${p}-country`} name="country" defaultValue={brand?.country ?? ""} />
        </Field>
      </div>
      <Field label={t.description} htmlFor={`${p}-desc`}>
        <Textarea id={`${p}-desc`} name="description" defaultValue={brand?.description ?? ""} rows={2} />
      </Field>
      {brand && <Checkbox name="active" label={t.active} defaultChecked={brand.active} />}
    </>
  );
}

export default async function AdminBrandsPage() {
  const copy = await getCopy();
  const [brands, series] = await Promise.all([listBrands(true), listSeries()]);
  return (
    <>
      <PageHeader title={copy.admin.brands} subtitle={copy.admin.brandsHint} />
      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-serif text-lg font-semibold">{copy.admin.addBrand}</h2>
        <ActionForm action={saveBrand} submitLabel={copy.admin.addBrand}>
          <BrandFields copy={copy} />
        </ActionForm>
      </Card>

      <ul className="space-y-3">
        {brands.map((b) => (
          <li key={b.id}>
            <details className="rounded-card border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4">
                <span className="font-medium">
                  {b.name} {!b.active && <span className="text-xs text-muted">({copy.admin.inactive})</span>}
                </span>
                <span className="text-xs text-muted">
                  {series.filter((s) => s.brand_id === b.id).map((s) => s.name).join(", ") || copy.admin.noSeries}
                </span>
              </summary>
              <div className="grid gap-6 border-t border-line p-4 lg:grid-cols-2">
                <ActionForm action={saveBrand}>
                  <BrandFields brand={b} copy={copy} />
                </ActionForm>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{copy.admin.seriesLines}</h3>
                  <ul className="mb-3 flex flex-wrap gap-1.5">
                    {series
                      .filter((s) => s.brand_id === b.id)
                      .map((s) => (
                        <li key={s.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                          {s.name}
                        </li>
                      ))}
                  </ul>
                  <ActionForm action={saveSeries} submitLabel={copy.admin.addSeries} className="flex flex-col gap-2">
                    <input type="hidden" name="brand_id" value={b.id} />
                    <Input name="name" placeholder={copy.admin.seriesName} aria-label={copy.admin.seriesName} required />
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
