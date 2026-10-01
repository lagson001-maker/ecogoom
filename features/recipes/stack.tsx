"use client";

// Visual representations of a layer stack. Data is stored bottom-up
// (layer_position 1 = on the clay); these render top-down like the pot.

import Link from "next/link";
import { useCopy } from "@/lib/i18n/client";
import { vocab } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";
import type { CoverageArea, GlazeWithBrand } from "@/types/domain";

export interface StackLayer {
  layer_position: number;
  coat_count: number | null;
  coverage_area: CoverageArea;
  coverage_percent: number | null;
  application_method?: string | null;
  notes?: string | null;
  glaze: GlazeWithBrand;
}

export function Swatch({ hex, label, size = "md" }: { hex: string | null; label?: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-10 w-10" : "h-5 w-5";
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full border border-black/15", s)}
      style={{ background: hex ?? "repeating-linear-gradient(45deg,#ddd 0 3px,#f5f5f5 3px 6px)" }}
      title={label}
      aria-hidden
    />
  );
}

const topDown = (layers: StackLayer[]) => [...layers].sort((a, b) => b.layer_position - a.layer_position);

/** Compact stack for cards: TOP / Honey Flux ×2 / Obsidian ×2 / CLAY */
export function MiniStack({ layers }: { layers: StackLayer[] }) {
  const copy = useCopy();
  return (
    <ol className="space-y-0.5 text-xs" aria-label={copy.recipe.layerOrder}>
      <li className="text-[10px] font-semibold tracking-widest text-muted" aria-hidden>
        {copy.common.top}
      </li>
      {topDown(layers).map((l) => (
        <li key={l.layer_position} className="flex items-center gap-1.5 text-ink">
          <Swatch hex={l.glaze.swatch_hex} size="sm" />
          <span className="truncate">{l.glaze.name}</span>
          {l.coat_count !== null && <span className="shrink-0 text-muted">×{l.coat_count}</span>}
        </li>
      ))}
      <li className="text-[10px] font-semibold tracking-widest text-muted" aria-hidden>
        {copy.common.clay}
      </li>
    </ol>
  );
}

/** Full stack for the detail page. */
export function LayerStack({ layers, clay }: { layers: StackLayer[]; clay?: string | null }) {
  const copy = useCopy();
  const { coverageLabel } = vocab(copy);
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-widest text-muted">{copy.common.top}</p>
      <ol className="overflow-hidden rounded-card border border-line">
        {topDown(layers).map((l) => (
          <li key={l.layer_position} className="flex items-stretch border-b border-line last:border-b-0">
            <div className="w-2 shrink-0" style={{ background: l.glaze.swatch_hex ?? "#ccc" }} aria-hidden />
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 bg-surface px-4 py-3">
              <span className="w-16 shrink-0 text-xs font-medium text-muted">{copy.editor.layer(l.layer_position)}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/glazes/${l.glaze.slug}`} className="font-medium text-ink hover:underline">
                  {l.glaze.brand.name} {l.glaze.name}
                </Link>
                {l.glaze.product_code && <span className="ml-1.5 text-xs text-muted">{l.glaze.product_code}</span>}
                <p className="text-sm text-ink-soft">
                  {l.coat_count !== null ? copy.common.coats(l.coat_count) : copy.common.coatsUnknown} · {coverageLabel(l.coverage_area, l.coverage_percent)}
                  {l.application_method && ` · ${l.application_method}`}
                </p>
                {l.notes && <p className="mt-0.5 text-xs text-muted">{l.notes}</p>}
              </div>
            </div>
          </li>
        ))}
        <li className="flex items-center gap-3 bg-surface-2 px-4 py-2.5 text-sm text-ink-soft">
          <span className="text-xs font-semibold tracking-widest text-muted">{copy.common.clay}</span>
          {clay && <span>{clay}</span>}
        </li>
      </ol>
      <p className="mt-2 text-xs text-muted">{copy.recipe.stackHint}</p>
    </div>
  );
}

/** Band each coverage area occupies on a tile (0 = top/rim, 1 = foot). */
const BANDS: Record<CoverageArea, [number, number]> = {
  full: [0, 1],
  upper_half: [0, 0.5],
  upper_third: [0, 0.34],
  rim_only: [0, 0.12],
  overlap: [0.3, 0.62],
  brush_detail: [0.4, 0.55],
  custom: [0, 0.7],
};

/**
 * Stylized test tile drawn from glaze swatches. Clearly an illustration, never
 * presented as a fired result.
 */
export function TileIllustration({ layers, className, label }: { layers: StackLayer[]; className?: string; label?: string }) {
  const copy = useCopy();
  const bottomUp = [...layers].sort((a, b) => a.layer_position - b.layer_position);
  const W = 120;
  const H = 160;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={label ?? copy.common.illustration}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width={W} height={H} fill="#d9cbb7" />
      {bottomUp.map((l, i) => {
        const [from, to] = BANDS[l.coverage_area];
        const y = from * H;
        const h = (to - from) * H;
        const drip = i > 0 && l.coverage_area !== "full" ? 10 : 0;
        const fill = l.glaze.swatch_hex ?? "#999";
        const opacity = i === 0 ? 1 : 0.82;
        const path = drip
          ? `M0 ${y} H${W} V${y + h} ` +
            Array.from({ length: 6 }, (_, k) => {
              const x1 = W - (k * W) / 6;
              const x2 = W - ((k + 1) * W) / 6;
              const d = k % 2 === 0 ? drip : drip / 3;
              return `Q${(x1 + x2) / 2} ${y + h + d} ${x2} ${y + h}`;
            }).join(" ") +
            " Z"
          : `M0 ${y} H${W} V${y + h} H0 Z`;
        return <path key={l.layer_position} d={path} fill={fill} opacity={opacity} />;
      })}
      <rect width={W} height={H} fill="url(#gs-sheen)" />
      <defs>
        <linearGradient id="gs-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
    </svg>
  );
}
