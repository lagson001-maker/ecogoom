"use client";

import { StatefulForm } from "@/components/ui/stateful-form";
import { useActionState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { LayerEditor, type GlazeOption } from "./layer-editor";
import { TagPicker } from "./tag-picker";
import { saveRecipe } from "./actions";
import { useCopy } from "@/lib/i18n/client";
import { COLOR_TAGS, CONES, EFFECT_TAGS, OPACITIES, SURFACE_TAGS, vocab } from "@/lib/vocabulary";
import type { LayerInput, Recipe } from "@/types/domain";

export type RecipeFormValues = Partial<Recipe> & { layers: LayerInput[] };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function LevelSelect({ name, label, value }: { name: string; label: string; value: number | null | undefined }) {
  const copy = useCopy();
  return (
    <Field label={label} htmlFor={`rf-${name}`}>
      <Select id={`rf-${name}`} name={name} defaultValue={value?.toString() ?? ""}>
        <option value="">{copy.common.unknown}</option>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n} — {copy.form.levels[n]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function RecipeForm({
  initial,
  glazes,
  isEditor,
  parentRecipeId,
}: {
  initial: RecipeFormValues;
  glazes: GlazeOption[];
  isEditor: boolean;
  parentRecipeId?: string | null;
}) {
  const copy = useCopy();
  const f = copy.form;
  const { ATMOSPHERES, CLAY_COLORS, DINNERWARE, SOURCE_TYPES, VERIFICATION, opacity } = vocab(copy);
  const [state, action] = useActionState(saveRecipe, null);
  const fe = state?.fieldErrors ?? {};

  return (
    <StatefulForm action={action} className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {parentRecipeId && <input type="hidden" name="parent_recipe_id" value={parentRecipeId} />}

      <div className="flex flex-col gap-5">
        <Panel title={f.basics}>
          <Field label={f.title} htmlFor="rf-title" error={fe.title}>
            <Input id="rf-title" name="title" defaultValue={initial.title ?? ""} required maxLength={200} />
          </Field>
          <Field label={f.shortDescription} htmlFor="rf-desc">
            <Textarea id="rf-desc" name="description" defaultValue={initial.description ?? ""} rows={2} />
          </Field>
        </Panel>

        <Panel title={copy.recipe.stackTitle}>
          <LayerEditor glazes={glazes} initial={initial.layers} error={fe.layers} />
        </Panel>

        <Panel title={copy.recipe.result}>
          <Field label={f.resultDescription} htmlFor="rf-result">
            <Textarea id="rf-result" name="result_description" defaultValue={initial.result_description ?? ""} rows={3} />
          </Field>
          <Field label={copy.editor.predictionNotes} htmlFor="rf-pred" hint={f.predictionHint}>
            <Textarea id="rf-pred" name="prediction_notes" defaultValue={initial.prediction_notes ?? ""} rows={2} />
          </Field>
          <TagPicker name="dominant_colors" legend={f.dominantColors} vocabulary={COLOR_TAGS} selected={initial.dominant_colors ?? []} swatches />
          <TagPicker name="color_tags" legend={f.secondaryColors} vocabulary={COLOR_TAGS} selected={initial.color_tags ?? []} swatches />
          <TagPicker name="effect_tags" legend={copy.recipe.effects} vocabulary={EFFECT_TAGS} selected={initial.effect_tags ?? []} />
          <TagPicker name="surface_tags" legend={copy.recipe.surface} vocabulary={SURFACE_TAGS} selected={initial.surface_tags ?? []} />
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel title={copy.recipe.firing}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.recipe.cone} htmlFor="rf-cone">
              <Select id="rf-cone" name="cone" defaultValue={initial.cone?.toString() ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {CONES.map((c) => (
                  <option key={c} value={c}>
                    {c < 0 ? `0${Math.abs(c)}` : c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.recipe.atmosphere} htmlFor="rf-atm">
              <Select id="rf-atm" name="atmosphere" defaultValue={initial.atmosphere ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {ATMOSPHERES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={copy.filters.clay} htmlFor="rf-clay">
            <Input id="rf-clay" name="clay_body_text" defaultValue={initial.clay_body_text ?? ""} placeholder={f.clayPlaceholder} />
          </Field>
          <Field label={f.clayColor} htmlFor="rf-claycolor">
            <Select id="rf-claycolor" name="clay_color" defaultValue={initial.clay_color ?? ""}>
              <option value="">{copy.common.unknown}</option>
              {CLAY_COLORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.applicationMethod} htmlFor="rf-app">
            <Input id="rf-app" name="application_method" defaultValue={initial.application_method ?? ""} placeholder={f.applicationPlaceholder} />
          </Field>
        </Panel>

        <Panel title={copy.recipe.behavior}>
          <div className="grid grid-cols-2 gap-3">
            <LevelSelect name="movement_level" label={copy.recipe.movement} value={initial.movement_level} />
            <LevelSelect name="run_risk" label={copy.recipe.runRisk} value={initial.run_risk} />
            <LevelSelect name="pinhole_risk" label={copy.recipe.pinholeRisk} value={initial.pinhole_risk} />
            <LevelSelect name="crawl_risk" label={copy.recipe.crawlRisk} value={initial.crawl_risk} />
          </div>
          <Field label={copy.recipe.opacity} htmlFor="rf-opacity">
            <Select id="rf-opacity" name="opacity" defaultValue={initial.opacity ?? ""}>
              <option value="">{copy.common.unknown}</option>
              {OPACITIES.map((o) => (
                <option key={o} value={o}>
                  {opacity(o)}
                </option>
              ))}
            </Select>
          </Field>
        </Panel>

        <Panel title={f.publishing}>
          {isEditor ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={f.visibility} htmlFor="rf-vis">
                  <Select id="rf-vis" name="visibility" defaultValue={initial.visibility ?? "public"}>
                    <option value="public">{f.public}</option>
                    <option value="private">{f.private}</option>
                  </Select>
                </Field>
                <Field label={f.status} htmlFor="rf-status">
                  <Select id="rf-status" name="status" defaultValue={initial.status ?? "draft"}>
                    <option value="draft">{f.draft}</option>
                    <option value="published">{f.published}</option>
                    <option value="archived">{f.archived}</option>
                  </Select>
                </Field>
                <Field label={copy.import.sourceType} htmlFor="rf-stype">
                  <Select id="rf-stype" name="source_type" defaultValue={initial.source_type ?? "community"}>
                    {Object.entries(SOURCE_TYPES).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={f.verification} htmlFor="rf-ver">
                  <Select id="rf-ver" name="verification_status" defaultValue={initial.verification_status ?? "unverified"}>
                    {Object.entries(VERIFICATION).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={copy.recipe.dinnerware} htmlFor="rf-dw" hint={f.dinnerwareHint}>
                <Select id="rf-dw" name="dinnerware_suitability" defaultValue={initial.dinnerware_suitability ?? "unknown"}>
                  {Object.entries(DINNERWARE).map(([v, d]) => (
                    <option key={v} value={v}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">{copy.editor.privateHint}</p>
              <Field label={f.verification} htmlFor="rf-ver">
                <Select id="rf-ver" name="verification_status" defaultValue={initial.verification_status ?? "unverified"}>
                  <option value="unverified">{f.notTested}</option>
                  <option value="personally_tested">{f.iTested}</option>
                  <option value="repeated_test">{f.testedSeveral}</option>
                </Select>
              </Field>
            </>
          )}
        </Panel>

        <Panel title={f.addSource}>
          <p className="-mt-2 text-xs text-muted">{f.addSourceHint}</p>
          <Field label={copy.import.sourceName} htmlFor="rf-sname">
            <Input id="rf-sname" name="source_name" placeholder={f.sourceNamePlaceholder} />
          </Field>
          <Field label="URL" htmlFor="rf-surl">
            <Input id="rf-surl" name="source_url" type="url" inputMode="url" placeholder="https://…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.import.author} htmlFor="rf-sauthor">
              <Input id="rf-sauthor" name="source_author" />
            </Field>
            <Field label={f.date} htmlFor="rf-sdate">
              <Input id="rf-sdate" name="source_date" type="date" />
            </Field>
          </div>
          <Field label={f.sourceNotes} htmlFor="rf-snotes">
            <Textarea id="rf-snotes" name="source_notes" rows={2} />
          </Field>
        </Panel>

        <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-md md:bottom-4">
          <FormMessage state={state} />
          <SubmitButton size="lg" pendingLabel={copy.common.saving}>
            {copy.common.save}
          </SubmitButton>
        </div>
      </div>
    </StatefulForm>
  );
}
