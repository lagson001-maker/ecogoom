"use client";

import { ChipCheckbox, Input } from "@/components/ui/form";
import { useCopy } from "@/lib/i18n/client";
import { COLOR_CHIP_HEX, vocab } from "@/lib/vocabulary";

/** Chips for the canonical vocabulary + a free-text field for anything else. */
export function TagPicker({
  name,
  legend,
  vocabulary,
  selected,
  swatches,
}: {
  name: string;
  legend: string;
  vocabulary: readonly string[];
  selected: string[];
  swatches?: boolean;
}) {
  const copy = useCopy();
  const v = vocab(copy);
  const custom = selected.filter((s) => !vocabulary.includes(s));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {vocabulary.map((tag) => (
          <ChipCheckbox
            key={tag}
            name={name}
            value={tag}
            label={v.tag(tag)}
            defaultChecked={selected.includes(tag)}
            swatch={swatches ? COLOR_CHIP_HEX[tag] : undefined}
          />
        ))}
      </div>
      <Input
        name={name}
        defaultValue={custom.join(", ")}
        placeholder={copy.form.otherTags}
        aria-label={copy.form.otherTagsAria(legend)}
        className="mt-2"
      />
    </fieldset>
  );
}
