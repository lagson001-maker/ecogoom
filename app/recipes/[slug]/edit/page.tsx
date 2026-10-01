import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Alert, PageHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { deleteRecipe } from "@/features/recipes/actions";
import { requireUser } from "@/lib/data/auth";
import { getGlazeOptions } from "@/lib/data/catalog";
import { getRecipeBySlug } from "@/lib/data/recipes";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.editor.editRecipe };
}

export default async function EditRecipePage({ params }: PageProps<"/recipes/[slug]/edit">) {
  const copy = await getCopy();
  const { slug } = await params;
  const viewer = await requireUser(`/recipes/${slug}/edit`);
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const canEdit =
    (recipe.visibility === "private" && recipe.created_by === viewer.userId) ||
    (recipe.visibility === "public" && viewer.isEditor);
  if (!canEdit) {
    return (
      <Alert tone="danger" title={copy.errors.unauthorized}>
        {copy.editor.notEditable}{" "}
        <Link href={`/recipes/${recipe.slug}`} className="underline">
          {copy.recipe.createVariation}
        </Link>
        {copy.editor.notEditableAfter}
      </Alert>
    );
  }

  const glazes = await getGlazeOptions();
  const canDelete = recipe.visibility === "private" || viewer.isAdmin;

  return (
    <>
      <PageHeader
        title={copy.editor.editRecipe}
        subtitle={
          <Link href={`/recipes/${recipe.slug}`} className="hover:underline">
            {recipe.title}
          </Link>
        }
        actions={
          canDelete && (
            <form action={deleteRecipe.bind(null, recipe.id)}>
              <SubmitButton variant="outline" className="text-danger" pendingLabel={copy.common.deleting} confirmMessage={copy.common.confirmDelete}>
                <Trash2 className="h-4 w-4" aria-hidden />
                {copy.common.delete}
              </SubmitButton>
            </form>
          )
        }
      />
      <RecipeForm
        initial={{
          ...recipe,
          layers: recipe.layers.map((l) => ({
            glaze_id: l.glaze_id,
            coat_count: l.coat_count,
            coverage_area: l.coverage_area,
            coverage_percent: l.coverage_percent,
            application_method: l.application_method,
            notes: l.notes,
          })),
        }}
        glazes={glazes}
        isEditor={viewer.isEditor}
      />
    </>
  );
}
