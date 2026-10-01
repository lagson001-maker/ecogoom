import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { COLOR_TAGS, CONES, GLAZE_TYPES, OPACITIES } from "@/lib/vocabulary";
import type { Brand, GlazeSeries, GlazeWithBrand } from "@/types/domain";

export function GlazeFields({
  glaze,
  brands,
  series,
}: {
  glaze?: GlazeWithBrand | null;
  brands: Brand[];
  series: (GlazeSeries & { brand: Pick<Brand, "name" | "slug"> })[];
}) {
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
        <Field label="Brand" htmlFor="g-brand">
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
        <Field label="Series" htmlFor="g-series">
          <Select id="g-series" name="series_id" defaultValue={glaze?.series_id ?? ""}>
            <option value="">None</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.brand.name} — {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" htmlFor="g-name">
          <Input id="g-name" name="name" defaultValue={glaze?.name} required />
        </Field>
        <Field label="Product code" htmlFor="g-code">
          <Input id="g-code" name="product_code" defaultValue={glaze?.product_code ?? ""} placeholder="e.g. PC-33" />
        </Field>
        <Field label="Slug" htmlFor="g-slug" hint="Auto from brand + name if empty.">
          <Input id="g-slug" name="slug" defaultValue={glaze?.slug} />
        </Field>
        <Field label="Type" htmlFor="g-type" hint="Pick or type any value.">
          <Input id="g-type" name="glaze_type" list="glaze-types" defaultValue={glaze?.glaze_type ?? "glaze"} />
          <datalist id="glaze-types">
            {GLAZE_TYPES.map((tp) => (
              <option key={tp} value={tp} />
            ))}
          </datalist>
        </Field>
        <Field label="Base color (words)" htmlFor="g-base">
          <Input id="g-base" name="base_color" defaultValue={glaze?.base_color ?? ""} />
        </Field>
        <Field label="Swatch" htmlFor="g-swatch" hint="Approximate only.">
          <Input id="g-swatch" name="swatch_hex" type="color" defaultValue={glaze?.swatch_hex ?? "#8a7a68"} className="h-11 p-1" />
        </Field>
        <Field label="Color family" htmlFor="g-family">
          <Select id="g-family" name="color_family" defaultValue={glaze?.color_family ?? ""}>
            <option value="">—</option>
            {COLOR_TAGS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Color tags" htmlFor="g-tags" hint="Comma separated; reactive glazes can have several.">
          <Input id="g-tags" name="color_tags" defaultValue={glaze?.color_tags.join(", ") ?? ""} />
        </Field>
        <Field label="Finish" htmlFor="g-finish">
          <Input id="g-finish" name="finish" defaultValue={glaze?.finish ?? ""} placeholder="gloss, satin, matte…" />
        </Field>
        <Field label="Opacity" htmlFor="g-opacity">
          <Select id="g-opacity" name="opacity" defaultValue={glaze?.opacity ?? ""}>
            <option value="">—</option>
            {OPACITIES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {cone("cone_min", "Cone min")}
          {cone("cone_max", "Cone max")}
        </div>
        <Field label="Manufacturer food-safe claim" htmlFor="g-food" hint="Only what the manufacturer states. Never infer.">
          <Select
            id="g-food"
            name="manufacturer_food_safe_claim"
            defaultValue={glaze?.manufacturer_food_safe_claim === true ? "yes" : glaze?.manufacturer_food_safe_claim === false ? "no" : ""}
          >
            <option value="">No statement recorded</option>
            <option value="yes">States food safe</option>
            <option value="no">States not food safe</option>
          </Select>
        </Field>
        <Field label="Official URL" htmlFor="g-url" className="sm:col-span-2">
          <Input id="g-url" name="official_url" type="url" defaultValue={glaze?.official_url ?? ""} />
        </Field>
      </div>
      <Field label="Manufacturer notes" htmlFor="g-notes">
        <Textarea id="g-notes" name="manufacturer_notes" defaultValue={glaze?.manufacturer_notes ?? ""} rows={3} />
      </Field>
      {glaze && <Checkbox name="active" label="Active (shown in library)" defaultChecked={glaze.active} />}
    </>
  );
}
