import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { GlazeAZ } from "@/features/catalog/glaze-az";
import { GlazeFilters } from "@/features/inventory/glaze-filters";
import { getViewer } from "@/lib/data/auth";
import { getClayResults, getPairings, listBrands, listGlazes, listSeries } from "@/lib/data/catalog";
import { orientPairing, type OrientedPairing } from "@/lib/pairings";
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
  const ids = glazes.map((g) => g.id);
  const [clayResults, pairingData] = await Promise.all([getClayResults(ids), getPairings(ids)]);
  const pairings = new Map<string, OrientedPairing[]>();
  for (const id of ids) {
    const list = pairingData.pairings
      .map((x) => orientPairing(x, id, pairingData.glazes))
      .filter((x): x is OrientedPairing => x !== null);
    if (list.length) pairings.set(id, list);
  }

  return (
    <>
      <PageHeader
        title={copy.glaze.library}
        subtitle={`${copy.glaze.librarySubtitle} ${copy.catalog.azHint}`}
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
        <GlazeAZ
          glazes={glazes}
          clayResults={clayResults}
          pairings={pairings}
          owned={new Set(owned)}
          signedIn={Boolean(viewer.userId)}
          copy={copy}
        />
      )}
    </>
  );
}
