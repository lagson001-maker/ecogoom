import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { GlazeCard, GlazeGrid } from "@/features/inventory/glaze-card";
import { getViewer } from "@/lib/data/auth";
import { getBrandBySlug, listGlazes, listSeries } from "@/lib/data/catalog";
import { getInventoryGlazeIds } from "@/lib/data/personal";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [brand, copy] = await Promise.all([getBrandBySlug(slug).catch(() => null), getCopy()]);
  return { title: brand?.name ?? copy.errors.notFound };
}

export default async function BrandPage({ params }: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  const [brand, viewer, copy] = await Promise.all([getBrandBySlug(slug), getViewer(), getCopy()]);
  if (!brand) notFound();

  const [glazes, series, owned] = await Promise.all([
    listGlazes({ brand: brand.slug }),
    listSeries(brand.id),
    getInventoryGlazeIds(viewer.userId),
  ]);
  const ownedSet = new Set(owned);

  return (
    <>
      <nav aria-label={copy.common.breadcrumb} className="mb-3 text-sm text-muted">
        <Link href="/brands" className="hover:underline">
          {copy.nav.brands}
        </Link>
      </nav>
      <PageHeader
        title={brand.name}
        subtitle={brand.description}
        actions={
          <>
            <LinkButton href={`/?brand=${brand.slug}`} variant="outline">
              {copy.brands.recipesUsing(brand.name)}
            </LinkButton>
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noreferrer nofollow"
                className="inline-flex h-11 items-center gap-1 px-2 text-sm text-glaze hover:underline"
              >
                {copy.brands.website} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </>
        }
      />

      {series.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/glazes?brand=${brand.slug}&series=${s.slug}`}
              className="inline-flex min-h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-sm text-ink-soft hover:bg-surface-2"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <Section title={copy.brands.glazesCount(glazes.length)} className="mt-0">
        {glazes.length === 0 ? (
          <EmptyState title={copy.brands.noGlazes} description={copy.brands.noGlazesHint} />
        ) : (
          <GlazeGrid>
            {glazes.map((g) => (
              <GlazeCard key={g.id} glaze={g} owned={ownedSet.has(g.id)} signedIn={Boolean(viewer.userId)} />
            ))}
          </GlazeGrid>
        )}
      </Section>
    </>
  );
}
