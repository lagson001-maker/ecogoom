// Small FormData readers for server actions. Inputs are untrusted.

import { COVERAGE_AREAS } from "@/lib/vocabulary";
import type { CoverageArea, LayerInput } from "@/types/domain";

export function str(fd: FormData, key: string, max = 4000): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function int(fd: FormData, key: string, min?: number, max?: number): number | null {
  const s = str(fd, key, 20);
  if (s === null) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n)) return null;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Reads tags from repeated checkboxes and/or a comma-separated text field. */
export function tags(fd: FormData, key: string): string[] {
  const values = fd
    .getAll(key)
    .flatMap((v) => (typeof v === "string" ? v.split(",") : []))
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 40))
    .filter(Boolean);
  return Array.from(new Set(values)).slice(0, 30);
}

export function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

const COVERAGE_VALUES = COVERAGE_AREAS.map((c) => c.value);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export const MAX_LAYERS = 8;

/** Parses the JSON layer list posted by LayerEditor (ordered bottom -> top). */
export function layersFromForm(fd: FormData, key = "layers"): LayerInput[] {
  const raw = fd.get(key);
  if (typeof raw !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .slice(0, MAX_LAYERS)
    .map((l): LayerInput | null => {
      if (typeof l !== "object" || l === null) return null;
      const o = l as Record<string, unknown>;
      if (!isUuid(o.glaze_id)) return null;
      const coats = Math.min(10, Math.max(1, Number(o.coat_count) || 1));
      const area = COVERAGE_VALUES.includes(o.coverage_area as CoverageArea) ? (o.coverage_area as CoverageArea) : "full";
      const pct = Number(o.coverage_percent);
      return {
        glaze_id: o.glaze_id,
        coat_count: coats,
        coverage_area: area,
        coverage_percent: Number.isFinite(pct) && pct >= 1 && pct <= 100 ? Math.round(pct) : null,
        application_method: typeof o.application_method === "string" ? o.application_method.slice(0, 200) || null : null,
        notes: typeof o.notes === "string" ? o.notes.slice(0, 1000) || null : null,
      };
    })
    .filter((l): l is LayerInput => l !== null);
}

export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;
