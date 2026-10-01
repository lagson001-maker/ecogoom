import { describe, expect, it } from "vitest";
import { recommend, emptyPersonalContext } from "../engine";
import { checkHardConstraints } from "../filters";
import { parseTextIntent } from "../intent";
import { scoreRecipe } from "../scoring";
import { recipeSimilarity, selectDiverse } from "../diversify";
import { constraints, glaze, recipe, request } from "./fixtures";
import type { PersonalContext } from "@/types/recommendation";

const obsidian = glaze("obsidian");
const honeyFlux = glaze("honey-flux");
const ironLustre = glaze("iron-lustre");
const blueRutile = glaze("blue-rutile");
const celadon10 = glaze("celadon-10", { cone_min: 10, cone_max: 10 });

function personal(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return { ...emptyPersonalContext(), ...overrides };
}

describe("hard filters", () => {
  it("rejects a recipe whose cone is outside tolerance", () => {
    const r = recipe([obsidian], { cone: 10 });
    expect(checkHardConstraints(r, constraints({ cone: 6 }), personal())).toBe("cone_mismatch");
  });

  it("accepts a recipe within cone tolerance", () => {
    const r = recipe([obsidian], { cone: 5 });
    expect(checkHardConstraints(r, constraints({ cone: 6 }), personal())).toBeNull();
  });

  it("rejects when a glaze's rated cone range excludes the request, even without recipe cone", () => {
    const r = recipe([celadon10], { cone: null });
    expect(checkHardConstraints(r, constraints({ cone: 6 }), personal())).toBe("glaze_cone_range");
  });

  it("rejects recipes using glazes outside the inventory when Only My Glazes is on", () => {
    const r = recipe([obsidian, blueRutile]);
    const p = personal({ inventoryGlazeIds: new Set(["obsidian", "honey-flux"]) });
    expect(checkHardConstraints(r, constraints({ onlyMyGlazes: true }), p)).toBe("not_in_inventory");
    expect(checkHardConstraints(recipe([obsidian, honeyFlux]), constraints({ onlyMyGlazes: true }), p)).toBeNull();
  });

  it("enforces the maximum number of glaze products", () => {
    const three = recipe([obsidian, ironLustre, honeyFlux]);
    expect(checkHardConstraints(three, constraints({ maxGlazes: 2 }), personal())).toBe("too_many_glazes");
    // Same glaze twice counts once as a product but twice as a layer.
    const repeated = recipe([obsidian, honeyFlux, obsidian]);
    expect(checkHardConstraints(repeated, constraints({ maxGlazes: 2 }), personal())).toBeNull();
    expect(checkHardConstraints(repeated, constraints({ maxLayers: 2 }), personal())).toBe("too_many_layers");
  });

  it("rejects excluded brands and required-atmosphere mismatches", () => {
    const mayco = glaze("norse-blue", { brand_id: "brand-mayco" });
    expect(checkHardConstraints(recipe([mayco]), constraints({ excludedBrandIds: ["brand-mayco"] }), personal())).toBe(
      "brand_excluded",
    );
    const red = recipe([obsidian], { atmosphere: "reduction" });
    expect(checkHardConstraints(red, constraints({ atmosphere: "oxidation", atmosphereRequired: true }), personal())).toBe(
      "atmosphere_mismatch",
    );
    expect(checkHardConstraints(red, constraints({ atmosphere: "oxidation" }), personal())).toBeNull();
  });
});

describe("scoring", () => {
  it("scores color and effect matches higher than non-matches", () => {
    const intent = parseTextIntent("olive green and brown, breaking and variegated");
    const match = recipe([obsidian], {
      dominant_colors: ["green", "brown"],
      color_tags: ["olive"],
      effect_tags: ["breaking", "variegated"],
    });
    const miss = recipe([obsidian], { dominant_colors: ["white"], effect_tags: ["glossy"] });
    const c = constraints();
    const a = scoreRecipe(match, intent, c, personal()).breakdown;
    const b = scoreRecipe(miss, intent, c, personal()).breakdown;
    expect(a.color).toBeGreaterThan(b.color);
    expect(a.visual).toBeGreaterThan(b.visual);
    expect(a.total).toBeGreaterThan(b.total);
  });

  it("gives a bonus to better-verified sources, all else equal", () => {
    const intent = parseTextIntent("black");
    const base = { dominant_colors: ["black"] };
    const unverified = recipe([obsidian], { ...base, verification_status: "unverified" });
    const documented = recipe([obsidian], { ...base, verification_status: "manufacturer_documented" });
    const c = constraints();
    expect(scoreRecipe(documented, intent, c, personal()).breakdown.total).toBeGreaterThan(
      scoreRecipe(unverified, intent, c, personal()).breakdown.total,
    );
  });

  it("boosts recipes the user rated highly and penalizes glazes they found too runny", () => {
    const r = recipe([obsidian, honeyFlux], { dominant_colors: ["black"] });
    const intent = parseTextIntent("black");
    const c = constraints({ riskTolerance: "low" });
    const neutral = scoreRecipe(r, intent, c, personal()).breakdown.total;
    const liked = scoreRecipe(r, intent, c, personal({ testedRecipeRatings: new Map([[r.id, 5]]) })).breakdown.total;
    const runny = scoreRecipe(r, intent, c, personal({ runnyGlazeIds: new Set(["honey-flux"]) })).breakdown.total;
    expect(liked).toBeGreaterThan(neutral);
    expect(runny).toBeLessThan(neutral);
  });

  it("prefers combinations the user can make with owned glazes", () => {
    const owned = recipe([obsidian, honeyFlux], { dominant_colors: ["black"] });
    const notOwned = recipe([blueRutile, ironLustre], { dominant_colors: ["black"] });
    const p = personal({ inventoryGlazeIds: new Set(["obsidian", "honey-flux"]) });
    const intent = parseTextIntent("black");
    expect(scoreRecipe(owned, intent, constraints(), p).breakdown.total).toBeGreaterThan(
      scoreRecipe(notOwned, intent, constraints(), p).breakdown.total,
    );
  });
});

describe("brand preference", () => {
  it("nudges recipes from preferred brands up", () => {
    const mayco = glaze("norse-blue", { brand_id: "brand-mayco" });
    const a = recipe([mayco], { dominant_colors: ["blue"] });
    const b = recipe([blueRutile], { dominant_colors: ["blue"] });
    const intent = parseTextIntent("blue");
    const c = constraints({ preferredBrandIds: ["brand-mayco"] });
    expect(scoreRecipe(a, intent, c, personal()).breakdown.total).toBeGreaterThan(
      scoreRecipe(b, intent, c, personal()).breakdown.total,
    );
  });
});

describe("intent parser", () => {
  it("maps Vietnamese phrases to tags with longest match first", () => {
    const i = parseTextIntent("men xanh rêu loang nâu");
    expect(i.dominant_colors).toEqual(expect.arrayContaining(["moss", "olive", "green", "brown"]));
    expect(i.dominant_colors).not.toContain("blue");
    expect(i.effect_tags).toEqual(expect.arrayContaining(["variegated", "mottled"]));
  });

  it("understands movement and dark tones", () => {
    const i = parseTextIntent("Muốn men tối, ánh nâu tím, hơi chảy nhưng không quá mạnh.");
    expect(i.movement).toBe("slight");
    expect(i.dominant_colors).toEqual(expect.arrayContaining(["black", "brown"]));
    expect([...i.dominant_colors, ...i.secondary_colors]).toContain("purple");
  });

  it("treats negated colors as colors to avoid and keeps 'không chảy' as stable", () => {
    const i = parseTextIntent("không chảy, tránh màu xanh, muốn nâu");
    expect(i.movement).toBe("stable");
    expect(i.avoid_colors).toEqual(expect.arrayContaining(["blue", "green"]));
    expect(i.dominant_colors).toEqual(["brown"]);
  });

  it("parses English descriptions and keeps unknown terms for text search", () => {
    const i = parseTextIntent("matte beige vintage Honey");
    expect(i.surface).toContain("matte");
    expect(i.dominant_colors).toContain("beige");
    const j = parseTextIntent("Obsidian combo");
    expect(j.unmatched_terms).toContain("obsidian");
  });
});

describe("recommend()", () => {
  const catalog = [
    recipe([obsidian, honeyFlux], { id: "honey-obs", dominant_colors: ["black", "amber"], color_tags: ["brown"], effect_tags: ["flowing"], movement_level: 3, run_risk: 3 }),
    recipe([obsidian, ironLustre], { id: "iron-obs", dominant_colors: ["black", "brown"], color_tags: ["purple"], effect_tags: ["metallic"], movement_level: 1, run_risk: 1 }),
    recipe([obsidian, ironLustre, honeyFlux], { id: "three", dominant_colors: ["black", "bronze"], color_tags: ["amber", "purple"], movement_level: 3, run_risk: 4 }),
    recipe([ironLustre, blueRutile], { id: "rutile", dominant_colors: ["blue", "brown"], movement_level: 2, run_risk: 2 }),
    recipe([celadon10], { id: "celadon", cone: 10, atmosphere: "reduction", dominant_colors: ["green"] }),
  ];

  it("journey 2: only owned glazes, max 2 products, cone 6", () => {
    const intent = parseTextIntent("Muốn men tối, ánh nâu tím, hơi chảy nhưng không quá mạnh.");
    const p = personal({ inventoryGlazeIds: new Set(["obsidian", "honey-flux", "iron-lustre"]) });
    const result = recommend(catalog, request({ onlyMyGlazes: true, maxGlazes: 2, cone: 6 }, intent), p);
    const ids = result.candidates.map((c) => c.recipe.id);
    expect(ids.sort()).toEqual(["honey-obs", "iron-obs"]);
    expect(result.rejectedCount).toBe(3);
    expect(result.candidates[0].recipe.id).toBe("iron-obs");
    expect(result.candidates[0].reasons.join(" ")).toMatch(/own all 2/);
  });

  it("returns no candidates and flags noCloseMatch when everything is filtered", () => {
    const result = recommend(catalog, request({ cone: 1 }));
    expect(result.candidates).toHaveLength(0);
    expect(result.noCloseMatch).toBe(true);
  });

  it("puts high run-risk recipes in the experimental bucket with a warning", () => {
    const result = recommend(catalog, request({ cone: 6 }, parseTextIntent("black bronze amber")));
    const three = result.candidates.find((c) => c.recipe.id === "three");
    expect(three?.bucket).toBe("experimental");
    expect(three?.warnings.length).toBeGreaterThan(0);
  });
});

describe("diversity", () => {
  it("does not pick a near-duplicate over a different combo of similar score", () => {
    const a = recipe([obsidian, honeyFlux], { id: "a", dominant_colors: ["black"], effect_tags: ["flowing"] });
    const aClone = recipe([obsidian, honeyFlux], { id: "a2", dominant_colors: ["black"], effect_tags: ["flowing"] });
    const b = recipe([blueRutile, ironLustre], { id: "b", dominant_colors: ["blue"], effect_tags: ["variegated"] });
    expect(recipeSimilarity(a, aClone)).toBeCloseTo(1);
    const picked = selectDiverse(
      [
        { recipe: a, total: 80 },
        { recipe: aClone, total: 79 },
        { recipe: b, total: 72 },
      ],
      2,
    );
    expect(picked.map((p) => p.item.recipe.id)).toEqual(["a", "b"]);
  });
});
