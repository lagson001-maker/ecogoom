import { Search } from "lucide-react";
import { Select } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { getCopy } from "@/lib/i18n/server";
import { COLOR_TAGS, vocab } from "@/lib/vocabulary";
import type { Brand, GlazeSeries } from "@/types/domain";

/** Search + Brand / Series / Color filters (GET form). */
export async function GlazeFilters({
  action,
  brands,
  series,
  values,
}: {
  action: string;
  brands: Brand[];
  series: (GlazeSeries & { brand: Pick<Brand, "name" | "slug"> })[];
  values: { q?: string | null; brand?: string | null; series?: string | null; color?: string | null };
}) {
  const copy = await getCopy();
  const v = vocab(copy);
  return (
    <form action={action} method="get" className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]">
      <div className="relative">
        <label htmlFor="gq" className="sr-only">
          {copy.common.search}
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="gq"
          name="q"
          type="search"
          defaultValue={values.q ?? ""}
          placeholder={copy.glaze.searchPlaceholder}
          className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3 text-base sm:text-sm"
        />
      </div>
      <Select name="brand" defaultValue={values.brand ?? ""} aria-label={copy.filters.brand}>
        <option value="">{copy.glaze.allBrands}</option>
        {brands.map((b) => (
          <option key={b.id} value={b.slug}>
            {b.name}
          </option>
        ))}
      </Select>
      <Select name="series" defaultValue={values.series ?? ""} aria-label={copy.filters.series}>
        <option value="">{copy.glaze.allSeries}</option>
        {series.map((s) => (
          <option key={s.id} value={s.slug}>
            {s.brand.name} — {s.name}
          </option>
        ))}
      </Select>
      <Select name="color" defaultValue={values.color ?? ""} aria-label={copy.filters.color}>
        <option value="">{copy.glaze.allColors}</option>
        {COLOR_TAGS.map((c) => (
          <option key={c} value={c}>
            {v.tag(c)}
          </option>
        ))}
      </Select>
      <button type="submit" className={buttonClass("secondary")}>
        {copy.common.apply}
      </button>
    </form>
  );
}
