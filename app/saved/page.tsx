import type { Metadata } from "next";
import { Bookmark, GitCompare } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { RecipeCard, RecipeGrid } from "@/features/recipes/recipe-card";
import { requireUser } from "@/lib/data/auth";
import { getSavedRecipes } from "@/lib/data/recipes";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.nav.saved };
}

export default async function SavedPage() {
  const copy = await getCopy();
  const viewer = await requireUser("/saved");
  const recipes = await getSavedRecipes(viewer.userId);

  return (
    <>
      <PageHeader
        title={copy.nav.saved}
        subtitle={copy.saved.subtitle}
        actions={
          recipes.length >= 2 && (
            <LinkButton href={`/compare?ids=${recipes.slice(0, 4).map((r) => r.id).join(",")}`} variant="outline">
              <GitCompare className="h-4 w-4" aria-hidden />
              {copy.saved.compareFirst(Math.min(4, recipes.length))}
            </LinkButton>
          )
        }
      />
      {recipes.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-8 w-8" />}
          title={copy.saved.empty}
          description={copy.saved.emptyHint}
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
