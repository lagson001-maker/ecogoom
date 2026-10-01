import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Copy, FlaskConical, GitCompare, Lock, Pencil, Utensils } from "lucide-react";
import { Alert, Badge, Card, EmptyState, Fact, Section } from "@/components/ui/primitives";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DinnerwareBadge, LevelMeter, VerificationBadge } from "@/features/recipes/badges";
import { LayerStack } from "@/features/recipes/stack";
import { RecipeCard, RecipeGrid, RecipeVisual } from "@/features/recipes/recipe-card";
import { SaveButton } from "@/features/recipes/save-button";
import { createVariation } from "@/features/recipes/actions";
import { startExperimentFromRecipe } from "@/features/lab/actions";
import { ExperimentCard } from "@/features/lab/experiment-card";
import { ImageUpload } from "@/features/media/image-upload";
import { MediaGallery } from "@/features/media/media-gallery";
import { getViewer } from "@/lib/data/auth";
import { getRecipeBySlug, getRelatedRecipes, getSavedRecipeIds } from "@/lib/data/recipes";
import { getExperimentsForRecipe } from "@/lib/data/personal";
import { getPairings } from "@/lib/data/catalog";
import { avoidedPairsIn } from "@/lib/pairings";
import { recipeVisualKind } from "@/lib/recipe-images";
import { BUCKETS } from "@/lib/storage";
import { getCopy } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";
import { riskLevel, vocab, type Vocab } from "@/lib/vocabulary";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [recipe, copy] = await Promise.all([getRecipeBySlug(slug).catch(() => null), getCopy()]);
  return { title: recipe?.title ?? copy.errors.notFound };
}

export default async function RecipePage({ params }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const [recipe, viewer, copy] = await Promise.all([getRecipeBySlug(slug), getViewer(), getCopy()]);
  if (!recipe) notFound();
  const t = copy.recipe;
  const v = vocab(copy);

  const glazeIds = [...new Set(recipe.layers.map((l) => l.glaze_id))];
  const [related, experiments, saved, pairingData] = await Promise.all([
    getRelatedRecipes(recipe),
    getExperimentsForRecipe(viewer.userId, recipe.id),
    getSavedRecipeIds(viewer.userId),
    getPairings(glazeIds),
  ]);
  const avoided = avoidedPairsIn(glazeIds, pairingData.pairings);

  const canEdit = Boolean(
    viewer.userId &&
      ((recipe.visibility === "private" && recipe.created_by === viewer.userId) ||
        (recipe.visibility === "public" && viewer.isEditor)),
  );
  const highRisk = riskLevel(recipe.run_risk) === "high" || riskLevel(recipe.movement_level) === "high";
  const multiGlaze = new Set(recipe.layers.map((l) => l.glaze_id)).size > 1;
  const missingGlaze = recipe.layers.some((l) => !l.glaze.active);
  const signedIn = Boolean(viewer.userId);

  return (
    <article>
      <nav aria-label={copy.common.breadcrumb} className="mb-3 text-sm text-muted">
        <Link href="/" className="hover:underline">
          {copy.nav.discover}
        </Link>{" "}
        / <span className="text-ink-soft">{recipe.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
        {/* Hero */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line bg-surface-2 lg:aspect-[4/5]">
            <RecipeVisual recipe={recipe} sizes="(min-width: 1024px) 40vw, 100vw" priority />
          </div>
          <VisualCaption recipe={recipe} copy={copy} />
          <MediaGallery media={recipe.media.filter((m) => m.id !== recipe.primary_image?.id || canEdit)} canEdit={canEdit} revalidate={`/recipes/${recipe.slug}`} />
          {canEdit && (
            <ImageUpload
              ownerType="recipe"
              ownerId={recipe.id}
              bucket={recipe.visibility === "public" ? BUCKETS.recipe : BUCKETS.private}
              folder={recipe.visibility === "public" ? `recipes/${recipe.id}` : `${viewer.userId}/recipes/${recipe.id}`}
              label={t.addResultPhoto}
              revalidate={`/recipes/${recipe.slug}`}
            />
          )}
        </div>

        {/* Summary */}
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <VerificationBadge status={recipe.verification_status} />
            <Badge tone="clay">{v.SOURCE_TYPES[recipe.source_type]}</Badge>
            {recipe.visibility === "private" && <Badge icon={<Lock className="h-3 w-3" aria-hidden />}>{t.personal}</Badge>}
            {recipe.status === "draft" && <Badge tone="warn">{copy.common.draft}</Badge>}
            {recipe.status === "archived" && <Badge tone="danger">{copy.common.archived}</Badge>}
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{recipe.title}</h1>
          {recipe.description && <p className="mt-2 text-lg text-ink-soft">{recipe.description}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <SaveButton recipeId={recipe.id} saved={saved.has(recipe.id)} signedIn={signedIn} />
            <form action={startExperimentFromRecipe.bind(null, recipe.id)}>
              <SubmitButton pendingLabel={copy.common.starting}>
                <FlaskConical className="h-4 w-4" aria-hidden />
                {t.testThisCombo}
              </SubmitButton>
            </form>
            <form action={createVariation.bind(null, recipe.id)}>
              <SubmitButton variant="outline" pendingLabel={copy.common.copying}>
                <Copy className="h-4 w-4" aria-hidden />
                {t.createVariation}
              </SubmitButton>
            </form>
            <LinkButton href={`/compare?ids=${recipe.id}`} variant="ghost">
              <GitCompare className="h-4 w-4" aria-hidden />
              {copy.nav.compare}
            </LinkButton>
            {canEdit && (
              <LinkButton href={`/recipes/${recipe.slug}/edit`} variant="ghost">
                <Pencil className="h-4 w-4" aria-hidden />
                {copy.common.edit}
              </LinkButton>
            )}
          </div>

          {recipe.status === "archived" && (
            <div className="mt-4">
              <Alert tone="danger">{t.archived}</Alert>
            </div>
          )}
          {missingGlaze && (
            <div className="mt-4">
              <Alert tone="warn">{copy.errors.missingGlaze}</Alert>
            </div>
          )}

          <Section title={t.stackTitle} className="mt-6">
            <LayerStack layers={recipe.layers} clay={recipe.clay_body_text} />
          </Section>

          {avoided.map((a) => (
            <div key={a.id} className="mt-4">
              <Alert tone="warn" icon={<AlertTriangle className="h-4 w-4" />} title={copy.pairing.recipeWarning}>
                {pairingData.glazes.get(a.glaze_id)?.name} + {pairingData.glazes.get(a.other_glaze_id)?.name}:{" "}
                {a.reason ?? a.effect_description}
                {a.source_url && (
                  <a href={a.source_url} target="_blank" rel="noreferrer nofollow" className="ml-1 underline">
                    {copy.catalog.source}
                  </a>
                )}
              </Alert>
            </div>
          ))}

          {highRisk && (
            <div className="mt-4">
              <Alert tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
                {copy.safety.runWarning}
              </Alert>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 grid gap-x-10 lg:grid-cols-2">
        <div>
          {recipe.result_description && (
            <Section title={t.result}>
              <p className="leading-relaxed text-ink-soft">{recipe.result_description}</p>
            </Section>
          )}
          {recipe.prediction_notes && (
            <Section title={copy.editor.predictionNotes}>
              <p className="leading-relaxed text-ink-soft">{recipe.prediction_notes}</p>
            </Section>
          )}

          <Section title={t.firing}>
            <Card className="px-4 py-1">
              <dl>
                <Fact label={t.cone}>{recipe.cone ?? copy.common.unknown}</Fact>
                <Fact label={t.atmosphere}>
                  {v.ATMOSPHERES.find((a) => a.value === recipe.atmosphere)?.label ?? copy.common.unknown}
                </Fact>
                <Fact label={t.clay}>
                  {[recipe.clay_body_text, v.CLAY_COLORS.find((c) => c.value === recipe.clay_color)?.label]
                    .filter(Boolean)
                    .join(" · ") || copy.common.unknown}
                </Fact>
                <Fact label={t.application}>{recipe.application_method ?? copy.common.unknown}</Fact>
              </dl>
            </Card>
          </Section>

          <Section title={t.behavior}>
            <Card className="px-4 py-1">
              <dl>
                <Fact label={t.movement}>
                  <LevelMeter value={recipe.movement_level} label={t.movement} />
                </Fact>
                <Fact label={t.runRisk}>
                  <LevelMeter value={recipe.run_risk} label={t.runRisk} />
                </Fact>
                {recipe.pinhole_risk !== null && (
                  <Fact label={t.pinholeRisk}>
                    <LevelMeter value={recipe.pinhole_risk} label={t.pinholeRisk} />
                  </Fact>
                )}
                {recipe.crawl_risk !== null && (
                  <Fact label={t.crawlRisk}>
                    <LevelMeter value={recipe.crawl_risk} label={t.crawlRisk} />
                  </Fact>
                )}
                <Fact label={t.surface}>{v.tags(recipe.surface_tags) || copy.common.unknown}</Fact>
                <Fact label={t.opacity}>{recipe.opacity ? v.opacity(recipe.opacity) : copy.common.unknown}</Fact>
              </dl>
            </Card>
          </Section>

          <Section title={t.dinnerware}>
            <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
              <Utensils className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
              <div className="space-y-1 text-sm">
                <DinnerwareBadge value={recipe.dinnerware_suitability} />
                <p className="text-ink-soft">{v.DINNERWARE[recipe.dinnerware_suitability].hint}</p>
                {multiGlaze && <p className="text-muted">{copy.safety.layeredFoodSafety}</p>}
              </div>
            </div>
          </Section>
        </div>

        <div>
          <Section title={t.tags}>
            <TagGroup label={t.colors} tags={[...recipe.dominant_colors, ...recipe.color_tags]} param="color" v={v} />
            <TagGroup label={t.effects} tags={recipe.effect_tags} param="effect" v={v} />
            <TagGroup label={t.surface} tags={recipe.surface_tags} param="surface" v={v} />
          </Section>

          <Section title={t.sources}>
            {recipe.sources.length === 0 ? (
              <p className="text-sm text-muted">{t.noSources}</p>
            ) : (
              <ul className="space-y-2">
                {recipe.sources.map(({ source, is_primary }) => (
                  <li key={source.id} className="rounded-card border border-line bg-surface p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/sources/${source.id}`} className="font-medium text-ink hover:underline">
                        {source.name}
                      </Link>
                      <Badge>{v.SOURCE_TYPES[source.source_type]}</Badge>
                      {is_primary && <Badge tone="glaze">{copy.common.primary}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {[source.author, source.source_date && formatDate(source.source_date), copy.common.added(formatDate(source.imported_at))]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="mt-1 inline-flex items-center gap-1 break-all text-xs text-glaze hover:underline"
                      >
                        {source.url} <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                    {source.notes && <p className="mt-1 text-xs text-ink-soft">{source.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">{copy.safety.notGuaranteed}</p>
          </Section>

          <Section
            title={t.experiments}
            action={
              signedIn ? (
                <form action={startExperimentFromRecipe.bind(null, recipe.id)}>
                  <button className={buttonClass("ghost", "sm")}>+ {copy.lab.newTest}</button>
                </form>
              ) : null
            }
          >
            {!signedIn ? (
              <p className="text-sm text-muted">
                <Link href={`/login?next=/recipes/${recipe.slug}`} className="text-glaze underline">
                  {copy.nav.signIn}
                </Link>{" "}
                {t.signInToLog}
              </p>
            ) : experiments.length === 0 ? (
              <p className="text-sm text-muted">{copy.lab.empty}</p>
            ) : (
              <div className="grid gap-3">
                {experiments.map((e) => (
                  <ExperimentCard key={e.id} experiment={e} />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <Section title={t.related} className="mt-10">
        {related.length === 0 ? (
          <EmptyState title={t.noRelated} />
        ) : (
          <RecipeGrid>
            {related.map((r) => (
              <RecipeCard key={r.id} recipe={r} saved={saved.has(r.id)} signedIn={signedIn} />
            ))}
          </RecipeGrid>
        )}
      </Section>
    </article>
  );
}

function TagGroup({ label, tags, param, v }: { label: string; tags: string[]; param: string; v: Vocab }) {
  const unique = Array.from(new Set(tags));
  if (unique.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((tag) => (
          <Link
            key={tag}
            href={`/?${param}=${encodeURIComponent(tag)}`}
            className="inline-flex min-h-8 items-center rounded-full border border-line-strong bg-surface px-3 text-sm text-ink-soft hover:bg-surface-2"
          >
            {v.tag(tag)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function VisualCaption({ recipe, copy }: { recipe: Parameters<typeof recipeVisualKind>[0] & { reference_image: { credit: string | null; source_url: string | null } | null }; copy: Messages }) {
  const kind = recipeVisualKind(recipe);
  if (kind === "own_photo") return null;
  const text =
    kind === "manufacturer_tile"
      ? copy.recipe.tileCaption(recipe.reference_image?.credit ?? copy.catalog.manufacturer)
      : kind === "glaze_photos"
        ? copy.recipe.glazePhotosCaption
        : copy.common.illustration;
  return (
    <p className="text-xs text-muted">
      {text}
      {kind === "manufacturer_tile" && recipe.reference_image?.source_url && (
        <a href={recipe.reference_image.source_url} target="_blank" rel="noreferrer nofollow" className="ml-1 text-glaze hover:underline">
          {copy.catalog.source} ↗
        </a>
      )}
    </p>
  );
}
