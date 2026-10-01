import { describe, expect, it } from "vitest";
import { matchTile, recipeVisualKind } from "@/lib/recipe-images";
import type { GlazePairing } from "@/types/domain";

const tile = (over: Partial<GlazePairing>): GlazePairing => ({
  id: crypto.randomUUID(), glaze_id: "walnut", other_glaze_id: "flux", verdict: "recommended", arrangement: "over",
  ratio_glaze: null, ratio_other: null, surface_rating: null, cone: 6, effect_description: "x", reason: null,
  image_url: "https://example.com/tile.jpg", image_credit: "Mayco", source_id: null, source_url: "https://example.com",
  verification_status: "manufacturer_documented", created_by: null, created_at: "", updated_at: "", ...over,
});
// walnut on top (layer 2) of flux (layer 1)
const recipe = (cone: number | null, top = "walnut", bottom = "flux") => ({
  cone,
  layers: [{ glaze_id: bottom, layer_position: 1 }, { glaze_id: top, layer_position: 2 }],
});

describe("matchTile()", () => {
  it("matches the same order stored either way round", () => {
    expect(matchTile(recipe(6), [tile({})])?.url).toBe("https://example.com/tile.jpg");
    expect(matchTile(recipe(6), [tile({ glaze_id: "flux", other_glaze_id: "walnut", arrangement: "under" })])).not.toBeNull();
  });

  it("rejects the reverse order", () => {
    expect(matchTile(recipe(6, "flux", "walnut"), [tile({})])).toBeNull();
  });

  it("never uses a tile fired at another cone", () => {
    expect(matchTile(recipe(10), [tile({ cone: 6 })])).toBeNull();
    expect(matchTile(recipe(6), [tile({ cone: 10, image_url: "https://example.com/c10.jpg" }), tile({ cone: 6 })])?.url).toBe(
      "https://example.com/tile.jpg",
    );
  });

  it("only applies to two-layer recipes of two different glazes", () => {
    expect(matchTile({ cone: 6, layers: [{ glaze_id: "walnut", layer_position: 1 }] }, [tile({})])).toBeNull();
    expect(matchTile(recipe(6, "walnut", "walnut"), [tile({ other_glaze_id: "walnut" })])).toBeNull();
  });
});

describe("recipeVisualKind()", () => {
  const photo = { glaze: { image_url: "https://example.com/chip.jpg" } };
  const none = { glaze: { image_url: null } };
  it("prefers own photo, then tile, then per-glaze photos, then illustration", () => {
    const ref = { kind: "manufacturer_tile" as const, url: "u", credit: null, source_url: null };
    expect(recipeVisualKind({ primary_image: {} as never, reference_image: ref, layers: [photo] })).toBe("own_photo");
    expect(recipeVisualKind({ primary_image: null, reference_image: ref, layers: [photo] })).toBe("manufacturer_tile");
    expect(recipeVisualKind({ primary_image: null, reference_image: null, layers: [photo, photo] })).toBe("glaze_photos");
    expect(recipeVisualKind({ primary_image: null, reference_image: null, layers: [photo, none] })).toBe("illustration");
  });
});
