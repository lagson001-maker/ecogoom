import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { RecipeStatusButtons } from "@/features/admin/recipe-status-buttons";
import { VerificationBadge } from "@/features/recipes/badges";
import { listAdminRecipes } from "@/lib/data/admin";
import { getCopy } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.admin.recipes };
}

const FILTERS = ["", "draft", "published", "archived"] as const;

export default async function AdminRecipesPage({ searchParams }: PageProps<"/admin/recipes">) {
  const copy = await getCopy();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && FILTERS.includes(sp.status as (typeof FILTERS)[number]) ? sp.status : "";
  const recipes = await listAdminRecipes(status || undefined);

  return (
    <>
      <PageHeader
        title={copy.admin.recipes}
        subtitle={copy.admin.recipesHint}
        actions={
          <LinkButton href="/recipes/new">
            <Plus className="h-4 w-4" aria-hidden /> {copy.editor.newRecipe}
          </LinkButton>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f || "all"}
            href={f ? `/admin/recipes?status=${f}` : "/admin/recipes"}
            className={cn(buttonClass(status === f ? "primary" : "outline", "sm"))}
          >
            {f ? copy.admin.recipeStatus[f] : copy.admin.all}
          </Link>
        ))}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {recipes.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Link href={`/recipes/${r.slug}`} className="font-medium hover:underline">
                {r.title}
              </Link>
              <p className="text-xs text-muted">
                {copy.recipe.cone} {r.cone ?? "?"} · {copy.common.layers(r.layer_count)} · {copy.admin.updated(formatDate(r.updated_at))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={r.status === "published" ? "ok" : r.status === "draft" ? "warn" : "neutral"}>{copy.admin.recipeStatus[r.status]}</Badge>
              <VerificationBadge status={r.verification_status} short />
              <LinkButton href={`/recipes/${r.slug}/edit`} variant="ghost" size="sm">
                {copy.common.edit}
              </LinkButton>
              <RecipeStatusButtons id={r.id} status={r.status} />
            </div>
          </li>
        ))}
        {recipes.length === 0 && <li className="px-4 py-6 text-sm text-muted">{copy.admin.noRecipes}</li>}
      </ul>
    </>
  );
}
