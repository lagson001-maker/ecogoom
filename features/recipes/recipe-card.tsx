"use client";

import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { VerificationBadge } from "./badges";
import { MiniStack, TileIllustration } from "./stack";
import { SaveButton } from "./save-button";
import { useCopy } from "@/lib/i18n/client";
import { vocab } from "@/lib/vocabulary";
import { recipeVisualKind } from "@/lib/recipe-images";
import type { Messages } from "@/lib/i18n";
import type { RecipeSummary } from "@/types/domain";

export function RecipeVisual({ recipe, sizes, priority }: { recipe: RecipeSummary; sizes: string; priority?: boolean }) {
  const copy = useCopy();
  if (recipe.primary_image) {
    return (
      <Image
        src={recipe.primary_image.url}
        alt={recipe.primary_image.alt_text ?? recipe.primary_image.caption ?? copy.recipe.firedResult(recipe.title)}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  const kind = recipeVisualKind(recipe);
  if (kind === "manufacturer_tile" && recipe.reference_image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- hotlinked manufacturer test tile, credited
      <img
        src={recipe.reference_image.url}
        alt={copy.recipe.tileAlt(recipe.title, recipe.reference_image.credit ?? "")}
        loading={priority ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (kind === "glaze_photos") {
    const topDown = [...recipe.layers].sort((a, b) => b.layer_position - a.layer_position);
    return (
      <div className="absolute inset-0 flex flex-col" role="img" aria-label={copy.recipe.visualTags.glaze_photos}>
        {topDown.map((l) => (
          <div key={l.id} className="relative min-h-0 flex-1 border-b border-white/40 last:border-b-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked manufacturer chip photo */}
            <img
              src={l.glaze.image_url!}
              alt=""
              loading={priority ? "eager" : "lazy"}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1 text-[10px] text-white">{l.glaze.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return <TileIllustration layers={recipe.layers} className="absolute inset-0 h-full w-full" />;
}

/** Small label saying what kind of picture is shown, so a swatch is never mistaken for a fired result. */
export function visualTag(recipe: RecipeSummary, copy: Messages): string | null {
  const kind = recipeVisualKind(recipe);
  if (kind === "own_photo") return null;
  if (kind === "manufacturer_tile") return copy.recipe.tileTag(recipe.reference_image?.credit ?? copy.catalog.manufacturer);
  return copy.recipe.visualTags[kind];
}

export function RecipeCard({
  recipe,
  saved,
  signedIn,
  priority,
}: {
  recipe: RecipeSummary;
  saved: boolean;
  signedIn: boolean;
  priority?: boolean;
}) {
  const copy = useCopy();
  const v = vocab(copy);
  const brands = Array.from(new Map(recipe.layers.map((l) => [l.glaze.brand.id, l.glaze.brand.name])).values());
  const tagsShown = recipe.effect_tags.slice(0, 2);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
        <RecipeVisual recipe={recipe} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw" priority={priority} />
        {visualTag(recipe, copy) && (
          <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{visualTag(recipe, copy)}</span>
        )}
        <div className="absolute right-2 top-2 z-10">
          <SaveButton recipeId={recipe.id} saved={saved} signedIn={signedIn} compact />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-serif text-base font-semibold leading-snug text-ink">
          <Link href={`/recipes/${recipe.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {recipe.title}
          </Link>
        </h3>

        <div className="flex flex-wrap gap-1">
          {brands.map((b) => (
            <Badge key={b} tone="clay">
              {b}
            </Badge>
          ))}
          {recipe.visibility === "private" && (
            <Badge icon={<Lock className="h-3 w-3" aria-hidden />}>{copy.recipe.personal}</Badge>
          )}
        </div>

        <MiniStack layers={recipe.layers} />

        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1 text-xs text-ink-soft">
          {recipe.cone !== null && <span className="font-medium text-ink">{v.coneValue(recipe.cone)}</span>}
          <span aria-hidden>·</span>
          <span>{copy.common.layers(recipe.layer_count || recipe.layers.length)}</span>
          {tagsShown.map((t) => (
            <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5">
              {v.tag(t)}
            </span>
          ))}
        </div>
        <div className="relative z-10">
          <VerificationBadge status={recipe.verification_status} short />
        </div>
      </div>
    </article>
  );
}

export function RecipeGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
