import { createBlankExperiment } from "@/features/lab/actions";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/data/auth";
import { getCopy } from "@/lib/i18n/server";

export default async function NewExperimentPage() {
  const [, copy] = await Promise.all([requireUser("/lab/new"), getCopy()]);
  return (
    <>
      <PageHeader title={copy.lab.newTest} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold">{copy.lab.emptyCta1}</h2>
          <p className="mt-1 text-sm text-ink-soft">{copy.lab.fromRecipeHint(copy.recipe.testThisCombo)}</p>
          <LinkButton href="/" variant="outline" className="mt-4">
            {copy.nav.discover}
          </LinkButton>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold">{copy.lab.emptyCta2}</h2>
          <p className="mt-1 text-sm text-ink-soft">{copy.lab.blankHint}</p>
          <form action={createBlankExperiment} className="mt-4">
            <SubmitButton>{copy.common.create}</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
