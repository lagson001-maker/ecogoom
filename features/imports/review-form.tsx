"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { LayerEditor, type GlazeOption } from "@/features/recipes/layer-editor";
import { TagPicker } from "@/features/recipes/tag-picker";
import { approveImport, type ApproveState } from "./actions";
import { copy } from "@/lib/i18n";
import { ATMOSPHERES, CLAY_COLORS, COLOR_TAGS, CONES, EFFECT_TAGS, SOURCE_TYPES, SURFACE_TAGS } from "@/lib/vocabulary";
import type { ImportDraft, LayerInput } from "@/types/domain";

const t = copy.import;

export function ReviewForm({
  draft,
  layers,
  unmatched,
  glazes,
  isEditor,
}: {
  draft: ImportDraft;
  layers: LayerInput[];
  unmatched: string[];
  glazes: GlazeOption[];
  isEditor: boolean;
}) {
  const [state, action] = useActionState<ApproveState, FormData>(approveImport, null);
  const x = draft.extracted ?? {};
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2">
      <input type="hidden" name="draft_id" value={draft.id} />

      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold">Recipe</h2>
          <Field label="Title" htmlFor="rv-title" error={fe.title}>
            <Input id="rv-title" name="title" defaultValue={x.title ?? ""} required />
          </Field>
          {unmatched.length > 0 && (
            <Alert tone="warn" icon={<AlertTriangle className="h-4 w-4" />} title="Not found in the glaze database">
              {unmatched.join(", ")} — pick the right glaze below
              {isEditor ? (
                <>
                  {" "}or{" "}
                  <Link href="/admin/glazes/new" className="underline" target="_blank">
                    add it to the library
                  </Link>
                </>
              ) : (
                " or ask an editor to add it"
              )}
              . GlazeStack never creates glazes automatically.
            </Alert>
          )}
          <LayerEditor glazes={glazes} initial={layers} error={fe.layers} />
          <Field label="Result description" htmlFor="rv-result">
            <Textarea id="rv-result" name="result_description" defaultValue={x.notes ?? ""} rows={3} />
          </Field>
        </Card>
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <TagPicker name="dominant_colors" legend="Dominant colors" vocabulary={COLOR_TAGS} selected={x.color_tags?.slice(0, 2) ?? []} swatches />
          <TagPicker name="color_tags" legend="Secondary colors" vocabulary={COLOR_TAGS} selected={x.color_tags?.slice(2) ?? []} swatches />
          <TagPicker name="effect_tags" legend="Effects" vocabulary={EFFECT_TAGS} selected={x.effect_tags ?? []} />
          <TagPicker name="surface_tags" legend="Surface" vocabulary={SURFACE_TAGS} selected={x.surface_tags ?? []} />
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold">{copy.recipe.firing}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.recipe.cone} htmlFor="rv-cone">
              <Select id="rv-cone" name="cone" defaultValue={x.cone?.toString() ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {CONES.map((c) => (
                  <option key={c} value={c}>
                    {c < 0 ? `0${Math.abs(c)}` : c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.recipe.atmosphere} htmlFor="rv-atm">
              <Select id="rv-atm" name="atmosphere" defaultValue={x.atmosphere ?? ""}>
                <option value="">{copy.common.unknown}</option>
                {ATMOSPHERES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Clay body" htmlFor="rv-clay">
              <Input id="rv-clay" name="clay_body_text" defaultValue={x.clay_body ?? ""} />
            </Field>
            <Field label="Clay color" htmlFor="rv-claycolor">
              <Select id="rv-claycolor" name="clay_color" defaultValue="">
                <option value="">{copy.common.unknown}</option>
                {CLAY_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.recipe.movement} htmlFor="rv-move">
              <Select id="rv-move" name="movement_level" defaultValue="">
                <option value="">{copy.common.unknown}</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.recipe.runRisk} htmlFor="rv-run">
              <Select id="rv-run" name="run_risk" defaultValue="">
                <option value="">{copy.common.unknown}</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold">{copy.recipe.source}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.sourceName} htmlFor="rv-sname" className="col-span-2">
              <Input id="rv-sname" name="source_name" defaultValue={draft.source_name ?? ""} />
            </Field>
            <Field label={t.url} htmlFor="rv-surl" className="col-span-2">
              <Input id="rv-surl" name="source_url" type="url" defaultValue={draft.source_url ?? ""} />
            </Field>
            <Field label={t.author} htmlFor="rv-sauthor">
              <Input id="rv-sauthor" name="source_author" defaultValue={draft.source_author ?? x.source_author ?? ""} />
            </Field>
            <Field label="Date" htmlFor="rv-sdate">
              <Input id="rv-sdate" name="source_date" type="date" defaultValue={/^\d{4}-\d{2}-\d{2}$/.test(x.source_date ?? "") ? x.source_date! : ""} />
            </Field>
            <Field label="Source type" htmlFor="rv-stype" className="col-span-2">
              <Select id="rv-stype" name="source_type" defaultValue={draft.source_type}>
                {Object.entries(SOURCE_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {isEditor && (
            <Field label="Visibility" htmlFor="rv-vis" hint="Public imports are created as drafts for review.">
              <Select id="rv-vis" name="visibility" defaultValue="public">
                <option value="public">Public (draft)</option>
                <option value="private">Private</option>
              </Select>
            </Field>
          )}
        </Card>

        {state?.duplicates && state.duplicates.length > 0 && (
          <Card className="flex flex-col gap-3 border-warn p-4">
            <p className="font-semibold text-warn">{t.duplicate}</p>
            <ul className="space-y-3">
              {state.duplicates.map((d) => (
                <li key={d.id} className="text-sm">
                  <Link href={`/recipes/${d.slug}`} target="_blank" className="font-medium underline">
                    {d.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.canMerge && (
                      <SubmitButton name="duplicate_decision" value={`merge:${d.id}`} size="sm">
                        {t.mergeSource}
                      </SubmitButton>
                    )}
                    <SubmitButton name="duplicate_decision" value={`separate:${d.id}`} size="sm" variant="outline">
                      {t.separate}
                    </SubmitButton>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/import" className={buttonClass("ghost", "sm", "self-start")}>
              {copy.common.cancel}
            </Link>
          </Card>
        )}

        <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-md md:bottom-4">
          {!state?.duplicates && <FormMessage state={state} />}
          <SubmitButton size="lg" pendingLabel="Saving…">
            {t.approve}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
