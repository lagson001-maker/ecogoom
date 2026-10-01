"use client";

import { StatefulForm } from "@/components/ui/stateful-form";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Checkbox, ChipCheckbox, ChipRadio, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { askAction, type AskState } from "./actions";
import { AskResults } from "./ask-results";
import { downscaleImage } from "./downscale";
import { uploadImage, validateImage } from "@/features/media/image-upload";
import { useCopy } from "@/lib/i18n/client";
import { COLOR_CHIP_HEX, COLOR_TAGS, CONES, vocab } from "@/lib/vocabulary";
import type { GlazeOption } from "@/features/recipes/layer-editor";
import { coneName } from "@/lib/cones";

export function AskForm({
  userId,
  aiConfigured,
  brands,
  glazes,
  defaultText,
  defaultOnlyMine,
}: {
  userId: string | null;
  aiConfigured: boolean;
  brands: { id: string; name: string }[];
  glazes: GlazeOption[];
  defaultText: string;
  defaultOnlyMine: boolean;
}) {
  const copy = useCopy();
  const t = copy.ask;
  const v = vocab(copy);
  const { ATMOSPHERES, DESIRED_SURFACES, MOVEMENT_PREFERENCES, RISK_TOLERANCES } = v;
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const selectFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const [state, action] = useActionState<AskState, FormData>(async (prev, fd) => {
    if (file && userId && aiConfigured) {
      const small = await downscaleImage(file);
      const up = await uploadImage(small, "private-user-assets", `${userId}/references`, copy);
      if (up.error || !up.path) return { ok: false, message: up.error ?? copy.errors.uploadFailed };
      fd.set("image_path", up.path);
    }
    return askAction(prev, fd);
  }, null);

  useEffect(() => {
    if (state?.ok) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  const imageDisabledReason = !aiConfigured ? t.aiNotConfigured : !userId ? t.signInForImage : null;

  return (
    <>
      <StatefulForm action={action} className="flex flex-col gap-4">
        <Field label={t.lookLabel} htmlFor={`${id}-text`}>
          <Textarea id={`${id}-text`} name="text" defaultValue={defaultText} placeholder={t.placeholder} rows={3} maxLength={1000} />
        </Field>

        {/* Reference image */}
        <div>
          <p className="mb-1.5 text-sm font-medium">{t.referenceImage}</p>
          {imageDisabledReason ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface px-3 py-3 text-sm text-muted">
              {imageDisabledReason}
            </p>
          ) : preview ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={preview} alt={t.previewAlt} className="h-32 w-32 rounded-lg border border-line object-cover" />
              <button
                type="button"
                onClick={() => selectFile(null)}
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white"
                aria-label={t.removeImage}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor={`${id}-img`}
              className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-4 text-sm text-ink-soft hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
            >
              <ImagePlus className="h-5 w-5" aria-hidden /> Upload a photo of the finish you want
            </label>
          )}
          <input
            id={`${id}-img`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={Boolean(imageDisabledReason)}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              const invalid = f ? validateImage(f, copy) : null;
              setFileError(invalid);
              selectFile(invalid ? null : f);
              e.target.value = "";
            }}
          />
          {fileError && <p role="alert" className="mt-1 text-sm text-danger">{fileError}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label={t.maxGlazes} htmlFor={`${id}-mg`}>
            <Select id={`${id}-mg`} name="max_glazes" defaultValue="">
              <option value="">{copy.filters.any}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4+</option>
            </Select>
          </Field>
          <Field label={copy.recipe.cone} htmlFor={`${id}-cone`}>
            <Select id={`${id}-cone`} name="cone" defaultValue="">
              <option value="">{copy.filters.any}</option>
              {CONES.map((c) => (
                <option key={c} value={c}>
                  {coneName(c)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2 flex items-end">
            <Checkbox
              name="only_my_glazes"
              label={t.onlyMyGlazes}
              defaultChecked={defaultOnlyMine && Boolean(userId)}
              disabled={!userId}
            />
          </div>
        </div>
        {!userId && <p className="-mt-2 text-xs text-muted">{t.signInForInventory}</p>}

        <details className="rounded-card border border-line bg-surface">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium">{t.advanced}</summary>
          <div className="flex flex-col gap-4 border-t border-line p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={t.desiredColorCount} htmlFor={`${id}-dcc`} hint={t.desiredColorCountHint} className="col-span-2">
                <Input id={`${id}-dcc`} name="desired_color_count" type="number" inputMode="numeric" min={1} max={8} />
              </Field>
              <Field label={t.maxLayers} htmlFor={`${id}-ml`}>
                <Input id={`${id}-ml`} name="max_layers" type="number" inputMode="numeric" min={1} max={8} />
              </Field>
              <Field label={copy.recipe.atmosphere} htmlFor={`${id}-atm`}>
                <Select id={`${id}-atm`} name="atmosphere" defaultValue="">
                  <option value="">{copy.filters.any}</option>
                  {ATMOSPHERES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Checkbox name="atmosphere_required" label={t.requireAtmosphere} />
            <Field label={copy.filters.clay} htmlFor={`${id}-clay`}>
              <Input id={`${id}-clay`} name="clay_body" placeholder="e.g. speckled buff" />
            </Field>

            <ChipGroup legend={t.surface}>
              {DESIRED_SURFACES.map((s) => (
                <ChipCheckbox key={s.value} name="surface" value={s.value} label={s.label} />
              ))}
            </ChipGroup>
            <ChipGroup legend={t.movement}>
              <ChipRadio name="movement" value="" label={t.noPreference} defaultChecked />
              {MOVEMENT_PREFERENCES.map((m) => (
                <ChipRadio key={m.value} name="movement" value={m.value} label={m.label} />
              ))}
            </ChipGroup>
            <ChipGroup legend={t.risk}>
              {RISK_TOLERANCES.map((r) => (
                <ChipRadio key={r.value} name="risk" value={r.value} label={r.label} defaultChecked={r.value === "medium"} />
              ))}
            </ChipGroup>
            <ChipGroup legend={t.preferredColors}>
              {COLOR_TAGS.filter((c) => c !== "clear").map((c) => (
                <ChipCheckbox key={c} name="preferred_colors" value={c} label={v.tag(c)} swatch={COLOR_CHIP_HEX[c]} />
              ))}
            </ChipGroup>
            <ChipGroup legend={t.avoidColors}>
              {COLOR_TAGS.filter((c) => c !== "clear").map((c) => (
                <ChipCheckbox key={c} name="avoid_colors" value={c} label={v.tag(c)} swatch={COLOR_CHIP_HEX[c]} />
              ))}
            </ChipGroup>
            <ChipGroup legend={t.preferredBrands}>
              {brands.map((b) => (
                <ChipCheckbox key={b.id} name="preferred_brands" value={b.id} label={b.name} />
              ))}
            </ChipGroup>
            <ChipGroup legend={t.excludedBrands}>
              {brands.map((b) => (
                <ChipCheckbox key={b.id} name="excluded_brands" value={b.id} label={b.name} />
              ))}
            </ChipGroup>
            <Field label={t.allowedGlazes} htmlFor={`${id}-allowed`} hint={t.allowedGlazesHint}>
              <Select id={`${id}-allowed`} name="allowed_glazes" multiple className="h-40 py-2">
                {glazes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.brand} — {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </details>

        {state && !state.ok && <Alert tone="danger">{state.message}</Alert>}
        <SubmitButton size="lg" pendingLabel={file ? t.analyzing : t.searching}>
          <Sparkles className="h-4 w-4" aria-hidden />
          {t.submit}
        </SubmitButton>
      </StatefulForm>

      <div ref={resultsRef} className="scroll-mt-20">
        {state?.ok && <AskResults outcome={state} />}
      </div>
    </>
  );
}

function ChipGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}
