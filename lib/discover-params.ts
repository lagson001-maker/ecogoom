// Discover filters <-> URL search params. Shared by server queries and filter UI.

import { ATMOSPHERES, CLAY_COLORS } from "@/lib/vocabulary";
import type { Atmosphere, ClayColor } from "@/types/domain";

export interface DiscoverFilters {
  q: string;
  brand: string[];
  glaze: string | null;
  series: string | null;
  color: string[];
  effect: string[];
  surface: string[];
  cone: number | null;
  atmosphere: Atmosphere | null;
  clay: ClayColor | null;
  glazes: number | null; // 4 means 4+
  layers: number | null; // 4 means 4+
  movement: number | null; // max
  risk: number | null; // max run risk
  verified: boolean;
  mine: boolean;
  tested: boolean;
  page: number;
}

export const PAGE_SIZE = 24;

type Params = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr.flatMap((x) => x.split(",")).map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20);
}

function one(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

function num(v: string | string[] | undefined, min: number, max: number): number | null {
  const s = one(v);
  if (s === null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function parseDiscoverParams(sp: Params): DiscoverFilters {
  const atmosphere = one(sp.atmosphere);
  const clay = one(sp.clay);
  return {
    q: (one(sp.q) ?? "").slice(0, 200),
    brand: list(sp.brand),
    glaze: one(sp.glaze),
    series: one(sp.series)?.toLowerCase() ?? null,
    color: list(sp.color),
    effect: list(sp.effect),
    surface: list(sp.surface),
    cone: num(sp.cone, -22, 14),
    atmosphere: ATMOSPHERES.some((a) => a.value === atmosphere) ? (atmosphere as Atmosphere) : null,
    clay: CLAY_COLORS.some((c) => c.value === clay) ? (clay as ClayColor) : null,
    glazes: num(sp.glazes, 1, 4),
    layers: num(sp.layers, 1, 4),
    movement: num(sp.movement, 0, 5),
    risk: num(sp.risk, 0, 5),
    verified: one(sp.verified) === "1",
    mine: one(sp.mine) === "1",
    tested: one(sp.tested) === "1",
    page: num(sp.page, 1, 50) ?? 1,
  };
}

/** Serialize filters back to a query string, optionally overriding fields. */
export function toSearchParams(f: DiscoverFilters, overrides: Partial<DiscoverFilters> = {}): string {
  const merged = { ...f, ...overrides };
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === null || value === false || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    if (key === "page" && value === 1) continue;
    if (value === true) p.set(key, "1");
    else if (Array.isArray(value)) p.set(key, value.join(","));
    else p.set(key, String(value));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: DiscoverFilters): number {
  return (
    f.brand.length + f.color.length + f.effect.length + f.surface.length +
    [f.glaze, f.series, f.cone, f.atmosphere, f.clay, f.glazes, f.layers, f.movement, f.risk].filter((v) => v !== null).length +
    [f.verified, f.mine, f.tested].filter(Boolean).length
  );
}
