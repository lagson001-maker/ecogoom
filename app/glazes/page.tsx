import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { GlazeCard, GlazeGrid } from "@/features/inventory/glaze-card";
import { GlazeFilters } from "@/features/inventory/glaze-filters";
import { getViewer } from "@/lib/data/auth";
import { listBrands, listGlazes, listSeries } from "@/lib/data/catalog";
import { getInventoryGlazeIds } from "@/lib/data/personal";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.glaze.library };
}

export default async function GlazeLibraryPage({ searchParams }: PageProps<"/glazes">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : null);
  const f = { q: one("q"), brand: one("brand"), series: one("series"), color: one("color") };
  const [viewer, copy] = await Promise.all([getViewer(), getCopy()]);

  const [glazes, brands, series, owned] = await Promise.all([
    listGlazes(f),
    listBrands(),
    listSeries(),
    getInventoryGlazeIds(viewer.userId),
  ]);
  const ownedSet = new Set(owned);

  return (
    <>
      <PageHeader
        title={copy.glaze.library}
        subtitle={`${copy.glaze.librarySubtitle} ${copy.inventory.swatchNote}`}
        actions={
          viewer.isEditor && (
            <LinkButton href="/admin/glazes/new" variant="outline">
              <Plus className="h-4 w-4" aria-hidden /> {copy.glaze.newGlaze}
            </LinkButton>
          )
        }
      />
      <GlazeFilters action="/glazes" brands={brands} series={series} values={f} />
      {glazes.length === 0 ? (
        <EmptyState title={copy.glaze.noMatch} description={copy.discover.emptyHint} />
      ) : (
        <GlazeGrid>
          {glazes.map((g) => (
            <GlazeCard key={g.id} glaze={g} owned={ownedSet.has(g.id)} signedIn={Boolean(viewer.userId)} />
          ))}
        </GlazeGrid>
      )}
    </>
  );
}
