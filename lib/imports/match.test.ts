import { describe, expect, it } from "vitest";
import { matchGlaze, type MatchableGlaze } from "./match";

const glazes: MatchableGlaze[] = [
  { id: "1", name: "Honey Flux", brand: "AMACO", code: null },
  { id: "2", name: "Iron Lustre", brand: "AMACO", code: "PC-33" },
  { id: "3", name: "Light Flux", brand: "Mayco", code: null },
  { id: "4", name: "Obsidian", brand: "AMACO", code: null },
];

describe("matchGlaze", () => {
  it("matches exact names and product codes", () => {
    expect(matchGlaze({ glaze_name: "honey flux" }, glazes)?.id).toBe("1");
    expect(matchGlaze({ glaze_name: "PC-33" }, glazes)?.id).toBe("2");
  });

  it("uses the brand to disambiguate and tolerates extra words", () => {
    expect(matchGlaze({ glaze_name: "Amaco Iron Lustre glaze", brand_name: "AMACO" }, glazes)?.id).toBe("2");
    expect(matchGlaze({ glaze_name: "Light Flux", brand_name: "Mayco" }, glazes)?.id).toBe("3");
  });

  it("returns null for unknown or ambiguous names instead of guessing", () => {
    expect(matchGlaze({ glaze_name: "Blue Rutile" }, glazes)).toBeNull();
    expect(matchGlaze({ glaze_name: "Flux" }, glazes)).toBeNull();
  });
});
