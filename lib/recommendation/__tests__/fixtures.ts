import type { GlazeWithBrand, RecipeSummary } from "@/types/domain";
import type { RecommendationConstraints, RecommendationRequest } from "@/types/recommendation";
import { emptyIntent } from "../intent";

export function glaze(id: string, overrides: Partial<GlazeWithBrand> = {}): GlazeWithBrand {
  return {
    id,
    brand_id: "brand-amaco",
    series_id: null,
    product_code: null,
    name: id,
    slug: id,
    glaze_type: "glaze",
    base_color: null,
    swatch_hex: "#444444",
    color_family: null,
    color_tags: [],
    finish: null,
    opacity: null,
    cone_min: 5,
    cone_max: 6,
    manufacturer_food_safe_claim: null,
    manufacturer_notes: null,
    official_url: null,
    image_path: null,
    coats_min: null,
    coats_max: null,
    application_notes: null,
    image_url: null,
    image_credit: null,
    active: true,
    created_at: "",
    updated_at: "",
    brand: { id: overrides.brand_id ?? "brand-amaco", name: "AMACO", slug: "amaco" },
    series: null,
    ...overrides,
  };
}

let counter = 0;

export function recipe(
  glazes: GlazeWithBrand[],
  overrides: Partial<RecipeSummary> = {},
): RecipeSummary {
  const id = overrides.id ?? `recipe-${++counter}`;
  return {
    id,
    created_by: null,
    visibility: "public",
    status: "published",
    parent_recipe_id: null,
    title: id,
    slug: id,
    description: null,
    cone: 6,
    atmosphere: "oxidation",
    clay_body_text: null,
    clay_color: null,
    application_method: null,
    result_description: null,
    prediction_notes: null,
    dominant_colors: [],
    color_tags: [],
    surface_tags: [],
    effect_tags: [],
    movement_level: 1,
    run_risk: 1,
    pinhole_risk: null,
    crawl_risk: null,
    opacity: null,
    dinnerware_suitability: "unknown",
    source_type: "imported",
    verification_status: "unverified",
    user_rating: null,
    glaze_ids: glazes.map((g) => g.id),
    brand_ids: Array.from(new Set(glazes.map((g) => g.brand_id))),
    series_names: [],
    layer_count: glazes.length,
    glaze_count: new Set(glazes.map((g) => g.id)).size,
    all_tags: [],
    created_at: "",
    updated_at: "",
    primary_image: null,
    reference_image: null,
    layers: glazes.map((g, i) => ({
      id: `${id}-l${i + 1}`,
      recipe_id: id,
      glaze_id: g.id,
      layer_position: i + 1,
      coat_count: 2,
      coverage_percent: null,
      coverage_area: "full",
      application_method: null,
      notes: null,
      glaze: g,
    })),
    ...overrides,
  };
}

export function constraints(overrides: Partial<RecommendationConstraints> = {}): RecommendationConstraints {
  return {
    maxGlazes: null,
    maxLayers: null,
    desiredColorCount: null,
    preferredBrandIds: [],
    excludedBrandIds: [],
    allowedGlazeIds: [],
    onlyMyGlazes: false,
    cone: null,
    atmosphere: null,
    atmosphereRequired: false,
    clayBody: null,
    preferredColors: [],
    avoidColors: [],
    desiredSurface: [],
    movement: null,
    riskTolerance: "medium",
    ...overrides,
  };
}

export function request(
  c: Partial<RecommendationConstraints> = {},
  intent = emptyIntent(),
  text = "",
): RecommendationRequest {
  return { text, intent, constraints: constraints(c) };
}
