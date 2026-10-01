import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Badge, Card, EmptyState, Fact, PageHeader, Section } from "@/components/ui/primitives";
import { VerificationBadge } from "@/features/recipes/badges";
import { RecipeCard, RecipeGrid } from "@/features/recipes/recipe-card";
import { getViewer } from "@/lib/data/auth";
import { getSource } from "@/lib/data/sources";
import { getSavedRecipeIds } from "@/lib/data/recipes";
import { isUuid } from "@/lib/forms";
import { copy } from "@/lib/i18n";
import { SOURCE_TYPES } from "@/lib/vocabulary";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: copy.sources.title };

export default async function SourcePage({ params }: PageProps<"/sources/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [data, viewer] = await Promise.all([getSource(id), getViewer()]);
  if (!data) notFound();
  const { source, recipes } = data;
  const saved = await getSavedRecipeIds(viewer.userId);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link href="/sources" className="hover:underline">
          {copy.sources.title}
        </Link>
      </nav>
      <PageHeader title={source.name} subtitle={source.notes} />
      <Card className="max-w-2xl px-4 py-1">
        <dl>
          <Fact label="Type">
            <Badge>{SOURCE_TYPES[source.source_type]}</Badge>
          </Fact>
          <Fact label={copy.sources.evidence}>
            <VerificationBadge status={source.evidence_level} />
          </Fact>
          <Fact label="Author">{source.author ?? copy.common.unknown}</Fact>
          <Fact label="Source date">{source.source_date ? formatDate(source.source_date) : copy.common.unknown}</Fact>
          <Fact label="Imported">{formatDate(source.imported_at)}</Fact>
          {source.url && (
            <Fact label="URL">
              <a href={source.url} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-glaze hover:underline">
                Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Fact>
          )}
        </dl>
      </Card>
      <p className="mt-2 max-w-2xl text-xs text-muted">
        A single post or page is evidence, not proof. Results depend on clay, application and kiln.
      </p>

      <Section title={`${copy.sources.recipesImported} (${recipes.length})`}>
        {recipes.length === 0 ? (
          <EmptyState title="No visible recipes from this source." />
        ) : (
          <RecipeGrid>
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} saved={saved.has(r.id)} signedIn={Boolean(viewer.userId)} />
            ))}
          </RecipeGrid>
        )}
      </Section>
    </>
  );
}
