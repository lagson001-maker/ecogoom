import Link from "next/link";
import { X } from "lucide-react";
import { RecipeCard, RecipeGrid } from "@/features/recipes/recipe-card";
import { FilterForm } from "@/features/discover/filter-form";
import { MobileFilters } from "@/features/discover/mobile-filters";
import { SearchBar } from "@/features/discover/search-bar";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { getViewer } from "@/lib/data/auth";
import { listDiscoverRecipes, getSavedRecipeIds } from "@/lib/data/recipes";
import { listBrands, listGlazes, listSeries } from "@/lib/data/catalog";
import { getInventoryGlazeIds, getTestedRecipeIds } from "@/lib/data/personal";
import { activeFilterCount, parseDiscoverParams, toSearchParams, type DiscoverFilters } from "@/lib/discover-params";
import type { Messages } from "@/lib/i18n";
import { getCopy } from "@/lib/i18n/server";
import { vocab } from "@/lib/vocabulary";

export default async function DiscoverPage({ searchParams }: PageProps<"/">) {
  const f = parseDiscoverParams(await searchParams);
  const [viewer, copy] = await Promise.all([getViewer(), getCopy()]);

  const [inventoryIds, testedIds, brands, series, glazes, saved] = await Promise.all([
    getInventoryGlazeIds(viewer.userId),
    getTestedRecipeIds(viewer.userId),
    listBrands(),
    listSeries(),
    listGlazes(),
    getSavedRecipeIds(viewer.userId),
  ]);

  const result = await listDiscoverRecipes(f, { inventoryGlazeIds: inventoryIds, testedRecipeIds: testedIds });
  const options = { brands, series, glazes };
  const count = activeFilterCount(f);
  const formProps = { f, options, signedIn: Boolean(viewer.userId) };

  return (
    <>
      <PageHeader title={copy.discover.title} subtitle={copy.discover.subtitle} />

      <div className="mb-4 flex gap-2">
        <SearchBar defaultValue={f.q} />
        <MobileFilters count={count}>
          <FilterForm {...formProps} idPrefix="mf" />
        </MobileFilters>
      </div>

      <ActiveFilters f={f} searchTags={result.searchTags} copy={copy} />

      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {copy.discover.resultCount(result.total)}
          </p>
          {result.recipes.length === 0 ? (
            <EmptyState
              title={copy.discover.empty}
              description={copy.discover.emptyHint}
              actions={
                <>
                  <LinkButton href="/" variant="outline">
                    {copy.common.clear}
                  </LinkButton>
                  <LinkButton href={`/ask${f.q ? `?q=${encodeURIComponent(f.q)}` : ""}`}>{copy.nav.ask}</LinkButton>
                </>
              }
            />
          ) : (
            <RecipeGrid>
              {result.recipes.map((r, i) => (
                <RecipeCard key={r.id} recipe={r} saved={saved.has(r.id)} signedIn={Boolean(viewer.userId)} priority={i < 4} />
              ))}
            </RecipeGrid>
          )}
          {result.hasMore && (
            <div className="mt-6 flex justify-center">
              <LinkButton href={`/${toSearchParams(f, { page: f.page + 1 })}`} variant="outline" scroll={false}>
                {copy.common.loadMore}
              </LinkButton>
            </div>
          )}
        </div>

        <aside aria-label={copy.common.filters} className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-card border border-line bg-surface p-4">
            <FilterForm {...formProps} idPrefix="df" />
          </div>
        </aside>
      </div>
    </>
  );
}

function ActiveFilters({ f, searchTags, copy }: { f: DiscoverFilters; searchTags: string[]; copy: Messages }) {
  const v = vocab(copy);
  const chips: { label: string; href: string }[] = [];
  const without = (o: Partial<DiscoverFilters>) => `/${toSearchParams(f, { ...o, page: 1 })}`;
  for (const b of f.brand) chips.push({ label: b, href: without({ brand: f.brand.filter((x) => x !== b) }) });
  for (const c of f.color) chips.push({ label: v.tag(c), href: without({ color: f.color.filter((x) => x !== c) }) });
  for (const e of f.effect) chips.push({ label: v.tag(e), href: without({ effect: f.effect.filter((x) => x !== e) }) });
  for (const s of f.surface) chips.push({ label: v.tag(s), href: without({ surface: f.surface.filter((x) => x !== s) }) });
  if (f.glaze) chips.push({ label: f.glaze, href: without({ glaze: null }) });
  if (f.series) chips.push({ label: f.series, href: without({ series: null }) });
  if (f.cone !== null) chips.push({ label: v.coneValue(f.cone), href: without({ cone: null }) });
  if (f.atmosphere) chips.push({ label: v.ATMOSPHERES.find((a) => a.value === f.atmosphere)?.label ?? f.atmosphere, href: without({ atmosphere: null }) });
  if (f.clay) chips.push({ label: f.clay, href: without({ clay: null }) });
  if (f.glazes !== null) chips.push({ label: copy.common.glazes(f.glazes), href: without({ glazes: null }) });
  if (f.layers !== null) chips.push({ label: copy.common.layers(f.layers), href: without({ layers: null }) });
  if (f.movement !== null) chips.push({ label: copy.discover.movementMax(f.movement), href: without({ movement: null }) });
  if (f.risk !== null) chips.push({ label: copy.discover.runRiskMax(f.risk), href: without({ risk: null }) });
  if (f.verified) chips.push({ label: copy.filters.verifiedOnly, href: without({ verified: false }) });
  if (f.mine) chips.push({ label: copy.filters.myGlazesOnly, href: without({ mine: false }) });
  if (f.tested) chips.push({ label: copy.filters.personalTested, href: without({ tested: false }) });

  if (chips.length === 0 && searchTags.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {searchTags.length > 0 && (
        <span className="mr-1 text-sm text-muted">
          {copy.discover.interpretedAs}: <span className="text-ink-soft">{v.tags(searchTags)}</span>
        </span>
      )}
      {chips.map((c) => (
        <Link
          key={c.label + c.href}
          href={c.href}
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-clay-soft px-2.5 text-sm text-clay-strong hover:bg-line"
          aria-label={copy.discover.removeFilter(c.label)}
        >
          {c.label}
          <X className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ))}
    </div>
  );
}
