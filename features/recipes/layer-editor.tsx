"use client";

import { ArrowDown, ArrowUp, CopyPlus, Minus, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Swatch } from "./stack";
import { useCopy } from "@/lib/i18n/client";
import { MAX_LAYERS } from "@/lib/forms";
import { vocab } from "@/lib/vocabulary";
import type { LayerInput } from "@/types/domain";

export interface GlazeOption {
  id: string;
  name: string;
  brand: string;
  code: string | null;
  swatch: string | null;
}

function emptyLayer(): LayerInput {
  return { glaze_id: "", coat_count: 2, coverage_area: "full", coverage_percent: null, application_method: null, notes: null };
}

/**
 * Edits an ordered list of layers. State and the posted JSON are bottom -> top
 * (index 0 = layer 1, on the clay); the UI renders top -> bottom like the pot.
 */
export function LayerEditor({
  glazes,
  initial,
  name = "layers",
  error,
}: {
  glazes: GlazeOption[];
  initial: LayerInput[];
  name?: string;
  error?: string;
}) {
  const copy = useCopy();
  const t = copy.editor;
  const { COVERAGE_AREAS } = vocab(copy);
  const [layers, setLayers] = useState<LayerInput[]>(initial.length ? initial : [emptyLayer()]);
  const baseId = useId();
  const byBrand = new Map<string, GlazeOption[]>();
  for (const g of glazes) byBrand.set(g.brand, [...(byBrand.get(g.brand) ?? []), g]);
  const glazeById = new Map(glazes.map((g) => [g.id, g]));

  const update = (i: number, patch: Partial<LayerInput>) =>
    setLayers((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const move = (i: number, dir: 1 | -1) =>
    setLayers((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (i: number) => setLayers((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyLayer()]));
  const duplicate = (i: number) =>
    setLayers((ls) => (ls.length >= MAX_LAYERS ? ls : [...ls.slice(0, i + 1), { ...ls[i] }, ...ls.slice(i + 1)]));
  const add = () => setLayers((ls) => (ls.length >= MAX_LAYERS ? ls : [...ls, emptyLayer()]));

  const valid = layers.filter((l) => l.glaze_id);

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(valid)} />
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-muted">{copy.common.top}</p>
        <Button size="sm" variant="outline" onClick={add} disabled={layers.length >= MAX_LAYERS}>
          <Plus className="h-4 w-4" aria-hidden />
          {t.addLayer}
        </Button>
      </div>

      <ol className="space-y-2">
        {layers
          .map((layer, i) => ({ layer, i }))
          .reverse()
          .map(({ layer, i }) => {
            const g = glazeById.get(layer.glaze_id);
            const id = `${baseId}-${i}`;
            return (
              <li key={i} className="rounded-card border border-line bg-surface p-3" aria-label={t.layer(i + 1)}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Swatch hex={g?.swatch ?? null} />
                    <span className="text-sm font-semibold text-ink">{t.layer(i + 1)}</span>
                    {i === 0 && <span className="text-xs text-muted">· {t.onClay}</span>}
                  </div>
                  <div className="flex gap-1">
                    <IconBtn label={t.moveUp} onClick={() => move(i, 1)} disabled={i === layers.length - 1}>
                      <ArrowUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t.moveDown} onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowDown className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t.duplicateLayer} onClick={() => duplicate(i)} disabled={layers.length >= MAX_LAYERS}>
                      <CopyPlus className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label={t.remove} onClick={() => remove(i)}>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <label htmlFor={`${id}-glaze`} className="sr-only">
                      {t.glazeFor(t.layer(i + 1))}
                    </label>
                    <Select
                      id={`${id}-glaze`}
                      value={layer.glaze_id}
                      onChange={(e) => update(i, { glaze_id: e.target.value })}
                      required
                    >
                      <option value="">{t.pickGlaze}</option>
                      {[...byBrand.entries()].map(([brand, list]) => (
                        <optgroup key={brand} label={brand}>
                          {list.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                              {o.code ? ` (${o.code})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-1" role="group" aria-label={t.coatsFor(t.layer(i + 1))}>
                    <IconBtn label={t.fewerCoats} onClick={() => update(i, { coat_count: Math.max(1, layer.coat_count - 1) })}>
                      <Minus className="h-4 w-4" />
                    </IconBtn>
                    <span className="w-16 text-center text-sm font-medium" aria-live="polite">
                      {copy.common.coats(layer.coat_count)}
                    </span>
                    <IconBtn label={t.moreCoats} onClick={() => update(i, { coat_count: Math.min(10, layer.coat_count + 1) })}>
                      <Plus className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_7rem_1fr]">
                  <div>
                    <label htmlFor={`${id}-cov`} className="sr-only">
                      {t.coverage}
                    </label>
                    <Select
                      id={`${id}-cov`}
                      value={layer.coverage_area}
                      onChange={(e) => update(i, { coverage_area: e.target.value as LayerInput["coverage_area"] })}
                    >
                      {COVERAGE_AREAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor={`${id}-pct`} className="sr-only">
                      {t.coveragePercent}
                    </label>
                    <Input
                      id={`${id}-pct`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      placeholder={t.areaPlaceholder}
                      value={layer.coverage_percent ?? ""}
                      disabled={layer.coverage_area === "full"}
                      onChange={(e) => update(i, { coverage_percent: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`${id}-app`} className="sr-only">
                      {copy.form.applicationMethod}
                    </label>
                    <Input
                      id={`${id}-app`}
                      placeholder={t.methodPlaceholder}
                      value={layer.application_method ?? ""}
                      onChange={(e) => update(i, { application_method: e.target.value || null })}
                    />
                  </div>
                </div>
                <label htmlFor={`${id}-notes`} className="sr-only">
                  {t.layerNotes}
                </label>
                <Input
                  id={`${id}-notes`}
                  className="mt-2"
                  placeholder={t.notesPlaceholder}
                  value={layer.notes ?? ""}
                  onChange={(e) => update(i, { notes: e.target.value || null })}
                />
              </li>
            );
          })}
      </ol>
      <p className="mt-2 text-xs font-semibold tracking-widest text-muted">{copy.common.clay}</p>
      <p className="mt-1 text-xs text-muted">
        {copy.recipe.stackHint} {t.maxLayers}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
