import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { VerificationBadge } from "./badges";
import { MiniStack, TileIllustration } from "./stack";
import { SaveButton } from "./save-button";
import { copy } from "@/lib/i18n";
import { humanizeTag } from "@/lib/vocabulary";
import type { RecipeSummary } from "@/types/domain";

export function RecipeVisual({ recipe, sizes, priority }: { recipe: RecipeSummary; sizes: string; priority?: boolean }) {
  if (recipe.primary_image) {
    return (
      <Image
        src={recipe.primary_image.url}
        alt={recipe.primary_image.alt_text ?? recipe.primary_image.caption ?? `Fired result: ${recipe.title}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  return <TileIllustration layers={recipe.layers} className="absolute inset-0 h-full w-full" />;
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
  const brands = Array.from(new Map(recipe.layers.map((l) => [l.glaze.brand.id, l.glaze.brand.name])).values());
  const tagsShown = recipe.effect_tags.slice(0, 2);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
        <RecipeVisual recipe={recipe} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw" priority={priority} />
        {!recipe.primary_image && (
          <span className="absolute bottom-2 left-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white">Illustration</span>
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
          {recipe.cone !== null && <span className="font-medium text-ink">Cone {recipe.cone}</span>}
          <span aria-hidden>·</span>
          <span>{copy.common.layers(recipe.layer_count || recipe.layers.length)}</span>
          {tagsShown.map((t) => (
            <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5">
              {humanizeTag(t)}
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
