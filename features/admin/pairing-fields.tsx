import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CONES, vocab } from "@/lib/vocabulary";
import { coneName } from "@/lib/cones";
import type { Messages } from "@/lib/i18n";
import type { GlazeWithBrand } from "@/types/domain";

/** Fields for one source-backed pairing from `glazeId`'s side. Rendered inside an ActionForm. */
export function PairingFields({ glazeId, glazes, copy }: { glazeId: string; glazes: GlazeWithBrand[]; copy: Messages }) {
  const t = copy.pairing;
  const v = vocab(copy);
  const others = glazes.filter((g) => g.id !== glazeId);
  return (
    <>
      <input type="hidden" name="glaze_id" value={glazeId} />
      <Field label={t.partner} htmlFor="pf-other">
        <Select id="pf-other" name="other_glaze_id" required defaultValue="">
          <option value="" disabled>
            {copy.editor.pickGlaze}
          </option>
          {others.map((g) => (
            <option key={g.id} value={g.id}>
              {g.brand.name} — {g.name}
              {g.product_code ? ` (${g.product_code})` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.verdict} htmlFor="pf-verdict">
          <Select id="pf-verdict" name="verdict" defaultValue="recommended">
            <option value="recommended">{t.recommended}</option>
            <option value="avoid">{t.avoid}</option>
          </Select>
        </Field>
        <Field label={t.arrangement} htmlFor="pf-arr">
          <Select id="pf-arr" name="arrangement" defaultValue="over">
            <option value="over">{t.arrangementOver}</option>
            <option value="under">{t.arrangementUnder}</option>
            <option value="mix">{t.arrangementMix}</option>
          </Select>
        </Field>
        <Field label={t.ratio} htmlFor="pf-ratio-a">
          <div className="flex items-center gap-2">
            <Input id="pf-ratio-a" name="ratio_glaze" type="number" inputMode="numeric" min={1} max={20} placeholder="1" />
            <span aria-hidden>:</span>
            <Input name="ratio_other" type="number" inputMode="numeric" min={1} max={20} placeholder="1" aria-label={t.ratio} />
          </div>
        </Field>
        <Field label={t.surfaceRating} htmlFor="pf-surface">
          <Select id="pf-surface" name="surface_rating" defaultValue="">
            <option value="">{copy.common.unknown}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}/5
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.recipe.cone} htmlFor="pf-cone">
          <Select id="pf-cone" name="cone" defaultValue="">
            <option value="">{copy.common.unknown}</option>
            {CONES.map((c) => (
              <option key={c} value={c}>
                {coneName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.sources.evidence} htmlFor="pf-ver">
          <Select id="pf-ver" name="verification_status" defaultValue="unverified">
            {Object.entries(v.VERIFICATION).map(([value, l]) => (
              <option key={value} value={value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t.effect} htmlFor="pf-effect">
        <Textarea id="pf-effect" name="effect_description" rows={2} required maxLength={2000} />
      </Field>
      <Field label={t.reason} htmlFor="pf-reason">
        <Input id="pf-reason" name="reason" maxLength={1000} />
      </Field>
      <Field label={copy.catalog.sourceUrl} htmlFor="pf-src">
        <Input id="pf-src" name="source_url" type="url" placeholder="https://…" required />
      </Field>
    </>
  );
}
