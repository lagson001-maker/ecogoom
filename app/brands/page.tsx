import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { getViewer } from "@/lib/data/auth";
import { countGlazesByBrand, listBrands, listSeries } from "@/lib/data/catalog";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.nav.brands };
}

export default async function BrandsPage() {
  const copy = await getCopy();
  const viewer = await getViewer();
  const [brands, counts, series] = await Promise.all([listBrands(), countGlazesByBrand(), listSeries()]);

  return (
    <>
      <PageHeader
        title={copy.nav.brands}
        subtitle={copy.brands.subtitle}
        actions={
          viewer.isEditor && (
            <LinkButton href="/admin/brands" variant="outline">
              <Plus className="h-4 w-4" aria-hidden /> Manage brands
            </LinkButton>
          )
        }
      />
      {brands.length === 0 ? (
        <EmptyState title={copy.brands.empty} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => {
            const lines = series.filter((s) => s.brand_id === b.id);
            return (
              <li key={b.id} className="relative rounded-card border border-line bg-surface p-4 shadow-sm hover:shadow-md">
                <h2 className="font-serif text-xl font-semibold">
                  <Link href={`/brands/${b.slug}`} className="after:absolute after:inset-0">
                    {b.name}
                  </Link>
                </h2>
                <p className="text-sm text-muted">
                  {[b.country, copy.common.glazes(counts.get(b.id) ?? 0)].filter(Boolean).join(" · ")}
                </p>
                {lines.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{lines.map((s) => s.name).join(", ")}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
