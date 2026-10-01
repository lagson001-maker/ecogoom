import type { Metadata } from "next";
import { Bookmark, GitCompare } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { RecipeCard, RecipeGrid } from "@/features/recipes/recipe-card";
import { requireUser } from "@/lib/data/auth";
import { getSavedRecipes } from "@/lib/data/recipes";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = { title: copy.nav.saved };

export default async function SavedPage() {
  const viewer = await requireUser("/saved");
  const recipes = await getSavedRecipes(viewer.userId);

  return (
    <>
      <PageHeader
        title={copy.nav.saved}
        subtitle="Recipes you bookmarked."
        actions={
          recipes.length >= 2 && (
            <LinkButton href={`/compare?ids=${recipes.slice(0, 4).map((r) => r.id).join(",")}`} variant="outline">
              <GitCompare className="h-4 w-4" aria-hidden />
              Compare first {Math.min(4, recipes.length)}
            </LinkButton>
          )
        }
      />
      {recipes.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-8 w-8" />}
          title="Nothing saved yet."
          description="Tap the bookmark on any recipe to keep it here."
          actions={<LinkButton href="/">{copy.nav.discover}</LinkButton>}
        />
      ) : (
        <RecipeGrid>
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} saved signedIn />
          ))}
        </RecipeGrid>
      )}
    </>
  );
}
