import { ChipCheckbox, Input } from "@/components/ui/form";
import { COLOR_CHIP_HEX, humanizeTag } from "@/lib/vocabulary";

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
  const custom = selected.filter((s) => !vocabulary.includes(s));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {vocabulary.map((v) => (
          <ChipCheckbox
            key={v}
            name={name}
            value={v}
            label={humanizeTag(v)}
            defaultChecked={selected.includes(v)}
            swatch={swatches ? COLOR_CHIP_HEX[v] : undefined}
          />
        ))}
      </div>
      <Input
        name={name}
        defaultValue={custom.join(", ")}
        placeholder="Other tags, comma separated"
        aria-label={`${legend}: other tags`}
        className="mt-2"
      />
    </fieldset>
  );
}
