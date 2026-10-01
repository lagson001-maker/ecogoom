import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CONES, vocab } from "@/lib/vocabulary";
import { coneName } from "@/lib/cones";
import type { Messages } from "@/lib/i18n";

/** Fields for one glaze-on-clay result. Rendered inside an ActionForm. */
export function ClayResultFields({ glazeId, copy }: { glazeId: string; copy: Messages }) {
  const t = copy.catalog;
  const v = vocab(copy);
  return (
    <>
      <input type="hidden" name="glaze_id" value={glazeId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={copy.form.clayColor} htmlFor="cr-clay">
          <Select id="cr-clay" name="clay_color" required defaultValue="">
            <option value="" disabled>
              —
            </option>
            {v.CLAY_COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.clayBodyName} htmlFor="cr-body">
          <Input id="cr-body" name="clay_body_text" placeholder={copy.form.clayPlaceholder} />
        </Field>
        <Field label={copy.recipe.cone} htmlFor="cr-cone">
          <Select id="cr-cone" name="cone" defaultValue="">
            <option value="">{copy.common.unknown}</option>
            {CONES.map((c) => (
              <option key={c} value={c}>
                {coneName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.recipe.atmosphere} htmlFor="cr-atm">
          <Select id="cr-atm" name="atmosphere" defaultValue="">
            <option value="">{copy.common.unknown}</option>
            {v.ATMOSPHERES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.catalog.coats} htmlFor="cr-coats">
          <Input id="cr-coats" name="coats" type="number" inputMode="numeric" min={1} max={10} />
        </Field>
        <Field label={copy.sources.evidence} htmlFor="cr-ver">
          <Select id="cr-ver" name="verification_status" defaultValue="unverified">
            {Object.entries(v.VERIFICATION).map(([value, l]) => (
              <option key={value} value={value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t.description} htmlFor="cr-desc">
        <Textarea id="cr-desc" name="result_description" rows={2} required maxLength={2000} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.sourceUrl} htmlFor="cr-src">
          <Input id="cr-src" name="source_url" type="url" placeholder="https://…" required />
        </Field>
        <Field label={t.resultImage} htmlFor="cr-img" hint={copy.glazeForm.imageUrlHint}>
          <Input id="cr-img" name="image_url" type="url" placeholder="https://…" />
        </Field>
      </div>
    </>
  );
}
