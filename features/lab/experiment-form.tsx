"use client";

import { Star } from "lucide-react";
import { useActionState } from "react";
import { Checkbox, ChipRadio, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { LayerEditor, type GlazeOption } from "@/features/recipes/layer-editor";
import { TagPicker } from "@/features/recipes/tag-picker";
import { saveExperiment } from "./actions";
import { copy } from "@/lib/i18n";
import { ATMOSPHERES, CLAY_COLORS, CONES, EFFECT_TAGS, EXPERIMENT_STATUS, RESULT_TAGS, SUCCESS_LEVELS } from "@/lib/vocabulary";
import type { ExperimentWithLayers } from "@/types/domain";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

export function ExperimentForm({ experiment, glazes }: { experiment: ExperimentWithLayers; glazes: GlazeOption[] }) {
  const [state, action] = useActionState(saveExperiment, null);
  const e = experiment;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2">
      <input type="hidden" name="id" value={e.id} />
      <div className="flex flex-col gap-5">
        <Panel title="Test setup">
          {e.recipe && <p className="-mt-2 text-sm text-muted">{copy.lab.clonedHint}</p>}
          <Field label="Title" htmlFor="ef-title" error={state?.fieldErrors?.title}>
            <Input id="ef-title" name="title" defaultValue={e.title} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" htmlFor="ef-status">
              <Select id="ef-status" name="status" defaultValue={e.status}>
                {Object.entries(EXPERIMENT_STATUS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Test date" htmlFor="ef-date">
              <Input id="ef-date" name="test_date" type="date" defaultValue={e.test_date ?? ""} />
            </Field>
            <Field label={copy.recipe.cone} htmlFor="ef-cone">
              <Select id="ef-cone" name="cone" defaultValue={e.cone?.toString() ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {CONES.map((c) => (
                  <option key={c} value={c}>
                    {c < 0 ? `0${Math.abs(c)}` : c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.recipe.atmosphere} htmlFor="ef-atm">
              <Select id="ef-atm" name="atmosphere" defaultValue={e.atmosphere ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {ATMOSPHERES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Clay body" htmlFor="ef-clay">
              <Input id="ef-clay" name="clay_body" defaultValue={e.clay_body ?? ""} placeholder="Your clay" />
            </Field>
            <Field label="Clay color" htmlFor="ef-claycolor">
              <Select id="ef-claycolor" name="clay_color" defaultValue={e.clay_color ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {CLAY_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title={copy.recipe.stackTitle}>
          <LayerEditor glazes={glazes} initial={e.layers.map((l) => ({
            glaze_id: l.glaze_id,
            coat_count: l.coat_count,
            coverage_area: l.coverage_area,
            coverage_percent: l.coverage_percent,
            application_method: l.application_method,
            notes: l.notes,
          }))} />
        </Panel>

        <Panel title="Process notes">
          <Field label="Application notes" htmlFor="ef-appnotes">
            <Textarea id="ef-appnotes" name="application_notes" defaultValue={e.application_notes ?? ""} rows={2} />
          </Field>
          <Field label="Kiln / firing notes" htmlFor="ef-kiln" hint="Schedule, kiln position, cooling…">
            <Textarea id="ef-kiln" name="kiln_notes" defaultValue={e.kiln_notes ?? ""} rows={2} />
          </Field>
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel title="After firing">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{copy.lab.rating}</legend>
            <div className="flex flex-wrap gap-1.5">
              <ChipRadio name="rating" value="" label="—" defaultChecked={!e.rating} />
              {[1, 2, 3, 4, 5].map((n) => (
                <ChipRadio
                  key={n}
                  name="rating"
                  value={String(n)}
                  defaultChecked={e.rating === n}
                  label={
                    <span className="inline-flex items-center gap-1">
                      {n} <Star className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  }
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{copy.lab.success}</legend>
            <div className="flex flex-wrap gap-1.5">
              <ChipRadio name="success_level" value="" label="Not fired yet" defaultChecked={!e.success_level} />
              {Object.entries(SUCCESS_LEVELS).map(([v, l]) => (
                <ChipRadio key={v} name="success_level" value={v} label={l} defaultChecked={e.success_level === v} />
              ))}
            </div>
          </fieldset>
          <Field label="Result notes" htmlFor="ef-result">
            <Textarea id="ef-result" name="result_notes" defaultValue={e.result_notes ?? ""} rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Observed movement" htmlFor="ef-move">
              <Select id="ef-move" name="movement_level" defaultValue={e.movement_level?.toString() ?? ""}>
                <option value="">—</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observed run risk" htmlFor="ef-run">
              <Select id="ef-run" name="run_risk_observed" defaultValue={e.run_risk_observed?.toString() ?? ""}>
                <option value="">—</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <TagPicker
            name="result_tags"
            legend={copy.lab.resultTags}
            vocabulary={[...EFFECT_TAGS, ...RESULT_TAGS]}
            selected={e.result_tags}
          />
          <Checkbox name="favorite" label={copy.inventory.favorite} defaultChecked={e.favorite} />
        </Panel>

        <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-md md:bottom-4">
          <FormMessage state={state} />
          <div className="flex gap-2">
            <SubmitButton size="lg" className="flex-1" pendingLabel="Saving…">
              {copy.common.save}
            </SubmitButton>
            <LinkButton href={`/lab/${e.id}`} variant="outline" size="lg">
              {copy.common.cancel}
            </LinkButton>
          </div>
        </div>
      </div>
    </form>
  );
}
