import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { requireUser } from "@/lib/data/auth";
import { getGlazeOptions } from "@/lib/data/catalog";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = { title: copy.editor.newRecipe };

export default async function NewRecipePage() {
  const viewer = await requireUser("/recipes/new");
  const glazes = await getGlazeOptions();
  return (
    <>
      <PageHeader
        title={copy.editor.newRecipe}
        subtitle={viewer.isEditor ? "Public recipes start as drafts until you publish them." : "Personal recipes are private to you."}
      />
      <RecipeForm
        initial={{ layers: [], visibility: viewer.isEditor ? "public" : "private" }}
        glazes={glazes}
        isEditor={viewer.isEditor}
      />
    </>
  );
}
