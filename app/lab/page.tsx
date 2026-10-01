import type { Metadata } from "next";
import { FlaskConical, Plus } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ExperimentCard } from "@/features/lab/experiment-card";
import { createBlankExperiment } from "@/features/lab/actions";
import { RecipeCard, RecipeGrid } from "@/features/recipes/recipe-card";
import { requireUser } from "@/lib/data/auth";
import { listExperiments } from "@/lib/data/personal";
import { getPersonalRecipes, getSavedRecipeIds } from "@/lib/data/recipes";
import { getCopy } from "@/lib/i18n/server";
import type { ExperimentWithLayers } from "@/types/domain";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).lab.title };
}

export default async function LabPage() {
  const [viewer, copy] = await Promise.all([requireUser("/lab"), getCopy()]);
  const s = copy.lab.sections;
  const [experiments, personalRecipes, saved] = await Promise.all([
    listExperiments(viewer.userId),
    getPersonalRecipes(viewer.userId),
    getSavedRecipeIds(viewer.userId),
  ]);

  const newTest = (
    <form action={createBlankExperiment}>
      <SubmitButton pendingLabel={copy.common.creating}>
        <Plus className="h-4 w-4" aria-hidden />
        {copy.lab.newTest}
      </SubmitButton>
    </form>
  );

  if (experiments.length === 0 && personalRecipes.length === 0) {
    return (
      <>
        <PageHeader title={copy.lab.title} subtitle={copy.lab.subtitle} />
        <EmptyState
          icon={<FlaskConical className="h-8 w-8" />}
          title={copy.lab.empty}
          description={copy.lab.emptyHint}
          actions={
            <>
              <LinkButton href="/" variant="outline">
                {copy.lab.emptyCta1}
              </LinkButton>
              <form action={createBlankExperiment}>
                <SubmitButton>{copy.lab.emptyCta2}</SubmitButton>
              </form>
            </>
          }
        />
      </>
    );
  }

  const groups: { title: string; items: ExperimentWithLayers[] }[] = [
    { title: s.in_progress, items: experiments.filter((e) => e.status === "in_progress") },
    { title: s.waiting_firing, items: experiments.filter((e) => e.status === "waiting_firing") },
    { title: s.completed, items: experiments.filter((e) => e.status === "completed" && e.success_level !== "failure") },
    { title: s.favorites, items: experiments.filter((e) => e.favorite) },
    { title: s.failed, items: experiments.filter((e) => e.success_level === "failure") },
  ];

  return (
    <>
      <PageHeader title={copy.lab.title} subtitle={copy.lab.subtitle} actions={newTest} />

      <nav aria-label={copy.lab.sectionsNav} className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {groups.map((g, i) => (
          <a
            key={g.title}
            href={`#lab-${i}`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-sm text-ink-soft hover:bg-surface-2"
          >
            {g.title} <span className="text-muted">{g.items.length}</span>
          </a>
        ))}
      </nav>

      {groups.map((g, i) =>
        g.items.length === 0 ? null : (
          <Section key={g.title} title={`${g.title} (${g.items.length})`}>
            <div id={`lab-${i}`} className="grid scroll-mt-20 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((e) => (
                <ExperimentCard key={e.id} experiment={e} />
              ))}
            </div>
          </Section>
        ),
      )}

      <Section
        title={copy.lab.personalRecipes}
        action={
          <LinkButton href="/recipes/new" variant="ghost" size="sm">
            <Plus className="h-4 w-4" aria-hidden /> {copy.editor.newRecipe}
          </LinkButton>
        }
      >
        {personalRecipes.length === 0 ? (
          <p className="text-sm text-muted">{copy.lab.personalEmpty}</p>
        ) : (
          <RecipeGrid>
            {personalRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} saved={saved.has(r.id)} signedIn />
            ))}
          </RecipeGrid>
        )}
      </Section>
    </>
  );
}
