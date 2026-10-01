import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Pencil } from "lucide-react";
import { Card, EmptyState, Fact, Section } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { InventoryButton } from "@/features/inventory/inventory-button";
import { RecipeCard, RecipeGrid } from "@/features/recipes/recipe-card";
import { Swatch } from "@/features/recipes/stack";
import { ExperimentCard } from "@/features/lab/experiment-card";
import { getViewer } from "@/lib/data/auth";
import { getGlazeBySlug, getGlazeUsage, type NeighborCount } from "@/lib/data/catalog";
import { getExperimentsUsingGlaze, getInventoryGlazeIds } from "@/lib/data/personal";
import { getSavedRecipeIds } from "@/lib/data/recipes";
import { publicObjectUrl } from "@/lib/storage";
import { copy } from "@/lib/i18n";
import { coneLabel, humanizeTag } from "@/lib/vocabulary";

const t = copy.glaze;

export async function generateMetadata({ params }: PageProps<"/glazes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const glaze = await getGlazeBySlug(slug).catch(() => null);
  return { title: glaze ? `${glaze.brand.name} ${glaze.name}` : copy.errors.notFound };
}

export default async function GlazePage({ params }: PageProps<"/glazes/[slug]">) {
  const { slug } = await params;
  const [glaze, viewer] = await Promise.all([getGlazeBySlug(slug), getViewer()]);
  if (!glaze) notFound();

  const [usage, owned, experiments, saved] = await Promise.all([
    getGlazeUsage(glaze.id),
    getInventoryGlazeIds(viewer.userId),
    getExperimentsUsingGlaze(viewer.userId, glaze.id),
    getSavedRecipeIds(viewer.userId),
  ]);
  const signedIn = Boolean(viewer.userId);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link href="/glazes" className="hover:underline">
          {t.library}
        </Link>{" "}
        /{" "}
        <Link href={`/brands/${glaze.brand.slug}`} className="hover:underline">
          {glaze.brand.name}
        </Link>
      </nav>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-card border border-line" style={{ background: glaze.swatch_hex ?? "#d9cbb7" }}>
            {glaze.image_path ? (
              <Image
                src={publicObjectUrl("public-glaze-assets", glaze.image_path)}
                alt={`${glaze.brand.name} ${glaze.name} product image`}
                fill
                sizes="(min-width: 768px) 35vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" aria-hidden />
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{copy.inventory.swatchNote}</p>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            {glaze.brand.name}
            {glaze.product_code && ` · ${glaze.product_code}`}
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{glaze.name}</h1>
          {glaze.series && <p className="mt-1 text-ink-soft">{glaze.series.name}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <InventoryButton glazeId={glaze.id} owned={owned.includes(glaze.id)} signedIn={signedIn} />
            <LinkButton href={`/?glaze=${glaze.slug}`} variant="outline">
              Recipes with this glaze
            </LinkButton>
            {viewer.isEditor && (
              <LinkButton href={`/admin/glazes/${glaze.id}`} variant="ghost">
                <Pencil className="h-4 w-4" aria-hidden /> {copy.common.edit}
              </LinkButton>
            )}
          </div>

          <Section title={t.characteristics}>
            <Card className="px-4 py-1">
              <dl>
                <Fact label={t.type}>{humanizeTag(glaze.glaze_type)}</Fact>
                <Fact label="Base color">
                  <span className="inline-flex items-center gap-2">
                    <Swatch hex={glaze.swatch_hex} size="sm" />
                    {glaze.base_color ?? copy.common.unknown}
                  </span>
                </Fact>
                <Fact label="Color tags">{glaze.color_tags.join(", ") || "—"}</Fact>
                <Fact label={t.finish}>{glaze.finish ?? copy.common.unknown}</Fact>
                <Fact label={copy.recipe.opacity}>{glaze.opacity ?? copy.common.unknown}</Fact>
                <Fact label={copy.recipe.cone}>{coneLabel(glaze.cone_min, glaze.cone_max)}</Fact>
                <Fact label={t.foodSafeClaim}>
                  {glaze.manufacturer_food_safe_claim === null
                    ? "No statement recorded"
                    : glaze.manufacturer_food_safe_claim
                      ? "Manufacturer states food safe (single glaze)"
                      : "Manufacturer states not food safe"}
                </Fact>
              </dl>
            </Card>
            <p className="mt-2 text-xs text-muted">{copy.safety.layeredFoodSafety}</p>
          </Section>

          {glaze.manufacturer_notes && (
            <Section title={t.manufacturerNotes}>
              <p className="text-ink-soft">{glaze.manufacturer_notes}</p>
            </Section>
          )}
          {glaze.official_url && (
            <a
              href={glaze.official_url}
              target="_blank"
              rel="noreferrer nofollow"
              className="mt-4 inline-flex items-center gap-1 text-sm text-glaze hover:underline"
            >
              {t.officialPage} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-x-10 md:grid-cols-2">
        <Neighbors title={t.popularAbove} items={usage.above} />
        <Neighbors title={t.popularBelow} items={usage.below} />
      </div>

      <Section title={`${t.recipesUsing} (${usage.recipes.length})`}>
        {usage.recipes.length === 0 ? (
          <EmptyState title="No recipes use this glaze yet." />
        ) : (
          <RecipeGrid>
            {usage.recipes.slice(0, 12).map((r) => (
              <RecipeCard key={r.id} recipe={r} saved={saved.has(r.id)} signedIn={signedIn} />
            ))}
          </RecipeGrid>
        )}
      </Section>

      {signedIn && (
        <Section title={t.myExperiments}>
          {experiments.length === 0 ? (
            <p className="text-sm text-muted">{copy.lab.empty}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {experiments.map((e) => (
                <ExperimentCard key={e.id} experiment={e} />
              ))}
            </div>
          )}
        </Section>
      )}
    </>
  );
}

function Neighbors({ title, items }: { title: string; items: NeighborCount[] }) {
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Not enough data yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {items.map(({ glaze, count }) => (
            <li key={glaze.id}>
              <Link href={`/glazes/${glaze.slug}`} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-surface-2">
                <Swatch hex={glaze.swatch_hex} />
                <span className="flex-1 text-sm">
                  <span className="font-medium text-ink">{glaze.name}</span>{" "}
                  <span className="text-muted">{glaze.brand.name}</span>
                </span>
                <span className="text-xs text-muted">{count}×</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
