import { ChipCheckbox, ChipRadio, Checkbox, Field, Select } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { getCopy } from "@/lib/i18n/server";
import { COLOR_CHIP_HEX, COLOR_TAGS, CONES, EFFECT_TAGS, SURFACE_TAGS, vocab } from "@/lib/vocabulary";
import type { DiscoverFilters } from "@/lib/discover-params";
import type { Brand, GlazeSeries, GlazeWithBrand } from "@/types/domain";

export interface FilterOptions {
  brands: Brand[];
  series: (GlazeSeries & { brand: Pick<Brand, "name" | "slug"> })[];
  glazes: GlazeWithBrand[];
}

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line pb-4">
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

/** Plain GET form: works without JS, shareable URLs. */
export async function FilterForm({
  f,
  options,
  signedIn,
  idPrefix,
}: {
  f: DiscoverFilters;
  options: FilterOptions;
  signedIn: boolean;
  idPrefix: string;
}) {
  const copy = await getCopy();
  const t = copy.filters;
  const v = vocab(copy);
  const { ATMOSPHERES, CLAY_COLORS } = v;
  const seriesNames = Array.from(new Set(options.series.map((s) => s.name)));
  return (
    <form action="/" method="get" className="flex flex-col gap-4">
      {f.q && <input type="hidden" name="q" value={f.q} />}

      <Group legend={t.brand}>
        {options.brands.map((b) => (
          <ChipCheckbox key={b.id} name="brand" value={b.slug} label={b.name} defaultChecked={f.brand.includes(b.slug)} />
        ))}
      </Group>

      <div className="grid grid-cols-2 gap-3 border-b border-line pb-4">
        <Field label={t.glaze} htmlFor={`${idPrefix}-glaze`} className="col-span-2">
          <Select id={`${idPrefix}-glaze`} name="glaze" defaultValue={f.glaze ?? ""}>
            <option value="">{t.any}</option>
            {options.glazes.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.brand.name} — {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.series} htmlFor={`${idPrefix}-series`} className="col-span-2">
          <Select id={`${idPrefix}-series`} name="series" defaultValue={f.series ?? ""}>
            <option value="">{t.any}</option>
            {seriesNames.map((s) => (
              <option key={s} value={s.toLowerCase()}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.cone} htmlFor={`${idPrefix}-cone`}>
          <Select id={`${idPrefix}-cone`} name="cone" defaultValue={f.cone?.toString() ?? ""}>
            <option value="">{t.any}</option>
            {CONES.map((c) => (
              <option key={c} value={c}>
                {c < 0 ? `0${Math.abs(c)}` : c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.atmosphere} htmlFor={`${idPrefix}-atm`}>
          <Select id={`${idPrefix}-atm`} name="atmosphere" defaultValue={f.atmosphere ?? ""}>
            <option value="">{t.any}</option>
            {ATMOSPHERES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.clay} htmlFor={`${idPrefix}-clay`} className="col-span-2">
          <Select id={`${idPrefix}-clay`} name="clay" defaultValue={f.clay ?? ""}>
            <option value="">{t.any}</option>
            {CLAY_COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Group legend={t.color}>
        {COLOR_TAGS.filter((c) => c !== "clear").map((c) => (
          <ChipCheckbox key={c} name="color" value={c} label={v.tag(c)} swatch={COLOR_CHIP_HEX[c]} defaultChecked={f.color.includes(c)} />
        ))}
      </Group>
      <Group legend={t.effect}>
        {EFFECT_TAGS.map((e) => (
          <ChipCheckbox key={e} name="effect" value={e} label={v.tag(e)} defaultChecked={f.effect.includes(e)} />
        ))}
      </Group>
      <Group legend={t.surface}>
        {SURFACE_TAGS.map((s) => (
          <ChipCheckbox key={s} name="surface" value={s} label={v.tag(s)} defaultChecked={f.surface.includes(s)} />
        ))}
      </Group>
      <Group legend={t.glazeCount}>
        <ChipRadio name="glazes" value="" label={t.any} defaultChecked={f.glazes === null} />
        {[1, 2, 3, 4].map((n) => (
          <ChipRadio key={n} name="glazes" value={String(n)} label={n === 4 ? "4+" : String(n)} defaultChecked={f.glazes === n} />
        ))}
      </Group>
      <Group legend={t.layerCount}>
        <ChipRadio name="layers" value="" label={t.any} defaultChecked={f.layers === null} />
        {[1, 2, 3, 4].map((n) => (
          <ChipRadio key={n} name="layers" value={String(n)} label={n === 4 ? "4+" : String(n)} defaultChecked={f.layers === n} />
        ))}
      </Group>
      <div className="grid grid-cols-2 gap-3 border-b border-line pb-4">
        <Field label={t.movement} htmlFor={`${idPrefix}-move`}>
          <Select id={`${idPrefix}-move`} name="movement" defaultValue={f.movement?.toString() ?? ""}>
            <option value="">{t.any}</option>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                ≤ {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.runRisk} htmlFor={`${idPrefix}-risk`}>
          <Select id={`${idPrefix}-risk`} name="risk" defaultValue={f.risk?.toString() ?? ""}>
            <option value="">{t.any}</option>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                ≤ {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col">
        <Checkbox name="verified" value="1" label={t.verifiedOnly} defaultChecked={f.verified} />
        <Checkbox name="mine" value="1" label={t.myGlazesOnly} defaultChecked={f.mine} disabled={!signedIn} />
        <Checkbox name="tested" value="1" label={t.personalTested} defaultChecked={f.tested} disabled={!signedIn} />
      </div>
      <div className="sticky -bottom-4 -mx-1 flex gap-2 bg-surface px-1 pt-2 pb-6">
        <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
          {copy.common.apply}
        </button>
        <a href={f.q ? `/?q=${encodeURIComponent(f.q)}` : "/"} className={buttonClass("outline", "md")}>
          {copy.common.clear}
        </a>
      </div>
    </form>
  );
}
