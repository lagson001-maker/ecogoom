import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { getCopy } from "@/lib/i18n/server";
import { COLOR_TAGS, CONES, GLAZE_TYPES, OPACITIES, vocab } from "@/lib/vocabulary";
import type { Brand, GlazeSeries, GlazeWithBrand } from "@/types/domain";

export async function GlazeFields({
  glaze,
  brands,
  series,
}: {
  glaze?: GlazeWithBrand | null;
  brands: Brand[];
  series: (GlazeSeries & { brand: Pick<Brand, "name" | "slug"> })[];
}) {
  const copy = await getCopy();
  const g = copy.glazeForm;
  const v = vocab(copy);
  const cone = (name: "cone_min" | "cone_max", label: string) => (
    <Field label={label} htmlFor={`g-${name}`}>
      <Select id={`g-${name}`} name={name} defaultValue={glaze?.[name]?.toString() ?? ""}>
        <option value="">?</option>
        {CONES.map((c) => (
          <option key={c} value={c}>
            {c < 0 ? `0${Math.abs(c)}` : c}
          </option>
        ))}
      </Select>
    </Field>
  );
  return (
    <>
      {glaze && <input type="hidden" name="id" value={glaze.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={copy.filters.brand} htmlFor="g-brand">
          <Select id="g-brand" name="brand_id" defaultValue={glaze?.brand_id ?? ""} required>
            <option value="" disabled>
              Choose…
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.filters.series} htmlFor="g-series">
          <Select id="g-series" name="series_id" defaultValue={glaze?.series_id ?? ""}>
            <option value="">None</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.brand.name} — {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.admin.name} htmlFor="g-name">
          <Input id="g-name" name="name" defaultValue={glaze?.name} required />
        </Field>
        <Field label={g.productCode} htmlFor="g-code">
          <Input id="g-code" name="product_code" defaultValue={glaze?.product_code ?? ""} placeholder="e.g. PC-33" />
        </Field>
        <Field label={copy.admin.slug} htmlFor="g-slug" hint={g.slugHint}>
          <Input id="g-slug" name="slug" defaultValue={glaze?.slug} />
        </Field>
        <Field label={copy.glaze.type} htmlFor="g-type" hint={g.typeHint}>
          <Input id="g-type" name="glaze_type" list="glaze-types" defaultValue={glaze?.glaze_type ?? "glaze"} />
          <datalist id="glaze-types">
            {GLAZE_TYPES.map((tp) => (
              <option key={tp} value={tp} />
            ))}
          </datalist>
        </Field>
        <Field label={g.baseColor} htmlFor="g-base">
          <Input id="g-base" name="base_color" defaultValue={glaze?.base_color ?? ""} />
        </Field>
        <Field label={g.swatch} htmlFor="g-swatch" hint={g.swatchHint}>
          <Input id="g-swatch" name="swatch_hex" type="color" defaultValue={glaze?.swatch_hex ?? "#8a7a68"} className="h-11 p-1" />
        </Field>
        <Field label={g.colorFamily} htmlFor="g-family">
          <Select id="g-family" name="color_family" defaultValue={glaze?.color_family ?? ""}>
            <option value="">—</option>
            {COLOR_TAGS.map((c) => (
              <option key={c} value={c}>
                {v.tag(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.glaze.colorTags} htmlFor="g-tags" hint={g.colorTagsHint}>
          <Input id="g-tags" name="color_tags" defaultValue={glaze?.color_tags.join(", ") ?? ""} />
        </Field>
        <Field label={copy.glaze.finish} htmlFor="g-finish">
          <Input id="g-finish" name="finish" defaultValue={glaze?.finish ?? ""} placeholder="gloss, satin, matte…" />
        </Field>
        <Field label={copy.recipe.opacity} htmlFor="g-opacity">
          <Select id="g-opacity" name="opacity" defaultValue={glaze?.opacity ?? ""}>
            <option value="">—</option>
            {OPACITIES.map((o) => (
              <option key={o} value={o}>
                {v.opacity(o)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {cone("cone_min", g.coneMin)}
          {cone("cone_max", g.coneMax)}
        </div>
        <Field label={copy.glaze.foodSafeClaim} htmlFor="g-food" hint={g.foodSafeHint}>
          <Select
            id="g-food"
            name="manufacturer_food_safe_claim"
            defaultValue={glaze?.manufacturer_food_safe_claim === true ? "yes" : glaze?.manufacturer_food_safe_claim === false ? "no" : ""}
          >
            <option value="">{copy.glaze.foodSafeNone}</option>
            <option value="yes">{g.statesSafe}</option>
            <option value="no">{g.statesNotSafe}</option>
          </Select>
        </Field>
        <Field label={g.officialUrl} htmlFor="g-url" className="sm:col-span-2">
          <Input id="g-url" name="official_url" type="url" defaultValue={glaze?.official_url ?? ""} />
        </Field>
      </div>
      <Field label={copy.glaze.manufacturerNotes} htmlFor="g-notes">
        <Textarea id="g-notes" name="manufacturer_notes" defaultValue={glaze?.manufacturer_notes ?? ""} rows={3} />
      </Field>
      {glaze && <Checkbox name="active" label={g.activeLabel} defaultChecked={glaze.active} />}
    </>
  );
}
