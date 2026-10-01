import { describe, expect, it } from "vitest";
import { avoidedPairsIn, orientPairing, sortPairings, type OrientedPairing } from "@/lib/pairings";
import { glaze } from "./fixtures";
import type { GlazePairing } from "@/types/domain";

const honey = glaze("honey-flux");
const obsidian = glaze("obsidian");
const seaweed = glaze("seaweed");
const glazes = new Map([honey, obsidian, seaweed].map((g) => [g.id, g]));

function pairing(over: Partial<GlazePairing>): GlazePairing {
  return {
    id: crypto.randomUUID(),
    glaze_id: honey.id,
    other_glaze_id: obsidian.id,
    verdict: "recommended",
    arrangement: "over",
    ratio_glaze: null,
    ratio_other: null,
    surface_rating: null,
    cone: 6,
    effect_description: "x",
    reason: null,
    source_id: null,
    source_url: "https://example.com",
    verification_status: "unverified",
    created_by: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("orientPairing()", () => {
  it("keeps the stored direction on the owning glaze", () => {
    const o = orientPairing(pairing({}), honey.id, glazes)!;
    expect(o.partner.id).toBe(obsidian.id);
    expect(o.arrangement).toBe("over");
  });

  it("flips over/under when viewed from the other glaze", () => {
    const o = orientPairing(pairing({}), obsidian.id, glazes)!;
    expect(o.partner.id).toBe(honey.id);
    expect(o.arrangement).toBe("under");
  });

  it("swaps the mix ratio from the other side", () => {
    const p = pairing({ arrangement: "mix", ratio_glaze: 2, ratio_other: 1 });
    expect(orientPairing(p, honey.id, glazes)!.ratio).toEqual([2, 1]);
    expect(orientPairing(p, obsidian.id, glazes)!.ratio).toEqual([1, 2]);
  });

  it("ignores pairings that do not involve the glaze", () => {
    expect(orientPairing(pairing({}), seaweed.id, glazes)).toBeNull();
  });
});

describe("sortPairings() / avoidedPairsIn()", () => {
  it("ranks by surface rating, then evidence", () => {
    const a = orientPairing(pairing({ surface_rating: 3 }), honey.id, glazes)!;
    const b = orientPairing(pairing({ surface_rating: 5, other_glaze_id: seaweed.id }), honey.id, glazes)!;
    const c = orientPairing(pairing({ surface_rating: 3, verification_status: "personally_tested" }), honey.id, glazes)!;
    expect(sortPairings([a, b, c] as OrientedPairing[]).map((x) => x.pairing.surface_rating)).toEqual([5, 3, 3]);
    expect(sortPairings([a, c])[0]).toBe(c);
  });

  it("finds avoid pairs inside a recipe in either order", () => {
    const avoid = pairing({ verdict: "avoid", glaze_id: obsidian.id, other_glaze_id: honey.id });
    const good = pairing({ other_glaze_id: seaweed.id });
    expect(avoidedPairsIn([honey.id, obsidian.id], [avoid, good])).toEqual([avoid]);
    expect(avoidedPairsIn([honey.id, seaweed.id], [avoid, good])).toEqual([]);
  });
});
