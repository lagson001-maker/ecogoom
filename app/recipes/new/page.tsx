import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { requireUser } from "@/lib/data/auth";
import { getGlazeOptions } from "@/lib/data/catalog";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.editor.newRecipe };
}

export default async function NewRecipePage() {
  const copy = await getCopy();
  const viewer = await requireUser("/recipes/new");
  const glazes = await getGlazeOptions();
  return (
    <>
      <PageHeader
        title={copy.editor.newRecipe}
        subtitle={viewer.isEditor ? copy.editor.publicHint : copy.editor.privateHint}
      />
      <RecipeForm
        initial={{ layers: [], visibility: viewer.isEditor ? "public" : "private" }}
        glazes={glazes}
        isEditor={viewer.isEditor}
      />
    </>
  );
}
