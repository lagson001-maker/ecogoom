// Domain types mirror supabase/migrations. Keep the two in sync.

export type Role = "user" | "editor" | "admin";

export type SourceType = "manufacturer" | "community" | "personal" | "imported" | "unknown";

export type VerificationStatus =
  | "unverified"
  | "community_reported"
  | "manufacturer_documented"
  | "personally_tested"
  | "repeated_test";

export type RecipeStatus = "draft" | "published" | "archived";
export type Visibility = "public" | "private";

export type Atmosphere =
  | "oxidation"
  | "reduction"
  | "neutral"
  | "wood"
  | "soda"
  | "salt"
  | "raku"
  | "unknown";

export type ClayColor = "white" | "buff" | "speckled" | "brown" | "red" | "dark" | "porcelain" | "other";

export type CoverageArea =
  | "full"
  | "upper_half"
  | "upper_third"
  | "rim_only"
  | "overlap"
  | "brush_detail"
  | "custom";

export type Opacity = "transparent" | "translucent" | "semi-opaque" | "opaque";

export type DinnerwareSuitability = "verified" | "manufacturer_guidance" | "unknown" | "not_recommended";

export type ExperimentStatus = "in_progress" | "waiting_firing" | "completed";
export type SuccessLevel = "success" | "partial" | "failure";

export type MediaOwnerType = "glaze" | "recipe" | "experiment" | "recommendation_reference";
export type Bucket = "public-glaze-assets" | "public-recipe-assets" | "private-user-assets";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  country: string | null;
  description: string | null;
  logo_path: string | null;
  active: boolean;
  created_at: string;
}

export interface GlazeSeries {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Glaze {
  id: string;
  brand_id: string;
  series_id: string | null;
  product_code: string | null;
  name: string;
  slug: string;
  glaze_type: string;
  base_color: string | null;
  swatch_hex: string | null;
  color_family: string | null;
  color_tags: string[];
  finish: string | null;
  opacity: Opacity | null;
  cone_min: number | null;
  cone_max: number | null;
  manufacturer_food_safe_claim: boolean | null;
  manufacturer_notes: string | null;
  official_url: string | null;
  image_path: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Glaze joined with its brand and series, as most screens need. */
export interface GlazeWithBrand extends Glaze {
  brand: Pick<Brand, "id" | "name" | "slug">;
  series: Pick<GlazeSeries, "id" | "name" | "slug"> | null;
}

export interface Source {
  id: string;
  name: string;
  source_type: SourceType;
  url: string | null;
  author: string | null;
  source_date: string | null;
  notes: string | null;
  evidence_level: VerificationStatus;
  created_by: string | null;
  imported_at: string;
  created_at: string;
}

export interface RecipeSource {
  recipe_id: string;
  source_id: string;
  is_primary: boolean;
  notes: string | null;
  source: Source;
}

export interface RecipeLayer {
  id: string;
  recipe_id: string;
  glaze_id: string;
  layer_position: number;
  coat_count: number;
  coverage_percent: number | null;
  coverage_area: CoverageArea;
  application_method: string | null;
  notes: string | null;
}

export interface RecipeLayerWithGlaze extends RecipeLayer {
  glaze: GlazeWithBrand;
}

export interface Recipe {
  id: string;
  created_by: string | null;
  visibility: Visibility;
  status: RecipeStatus;
  parent_recipe_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  cone: number | null;
  atmosphere: Atmosphere | null;
  clay_body_text: string | null;
  clay_color: ClayColor | null;
  application_method: string | null;
  result_description: string | null;
  prediction_notes: string | null;
  dominant_colors: string[];
  color_tags: string[];
  surface_tags: string[];
  effect_tags: string[];
  movement_level: number | null;
  run_risk: number | null;
  pinhole_risk: number | null;
  crawl_risk: number | null;
  opacity: Opacity | null;
  dinnerware_suitability: DinnerwareSuitability;
  source_type: SourceType;
  verification_status: VerificationStatus;
  user_rating: number | null;
  glaze_ids: string[];
  brand_ids: string[];
  series_names: string[];
  layer_count: number;
  glaze_count: number;
  all_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  owner_type: MediaOwnerType;
  owner_id: string;
  bucket: Bucket;
  storage_path: string;
  media_type: "image" | "video" | "document";
  caption: string | null;
  alt_text: string | null;
  source_url: string | null;
  source_credit: string | null;
  is_primary: boolean;
  created_by: string | null;
  created_at: string;
}

/** Media row plus a URL ready for <img>/<Image> (public or signed). */
export interface MediaWithUrl extends MediaAsset {
  url: string;
}

/** Everything the recipe card and the recommendation engine need. */
export interface RecipeSummary extends Recipe {
  layers: RecipeLayerWithGlaze[];
  primary_image: MediaWithUrl | null;
}

export interface RecipeDetail extends RecipeSummary {
  media: MediaWithUrl[];
  sources: RecipeSource[];
}

export interface Experiment {
  id: string;
  user_id: string;
  recipe_id: string | null;
  title: string;
  status: ExperimentStatus;
  clay_body: string | null;
  clay_color: ClayColor | null;
  cone: number | null;
  atmosphere: Atmosphere | null;
  kiln_notes: string | null;
  application_notes: string | null;
  result_notes: string | null;
  rating: number | null;
  success_level: SuccessLevel | null;
  movement_level: number | null;
  run_risk_observed: number | null;
  result_tags: string[];
  favorite: boolean;
  test_date: string | null;
  promoted_recipe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentLayer {
  id: string;
  experiment_id: string;
  glaze_id: string;
  layer_position: number;
  coat_count: number;
  coverage_percent: number | null;
  coverage_area: CoverageArea;
  application_method: string | null;
  notes: string | null;
}

export interface ExperimentLayerWithGlaze extends ExperimentLayer {
  glaze: GlazeWithBrand;
}

export interface ExperimentWithLayers extends Experiment {
  layers: ExperimentLayerWithGlaze[];
  recipe: Pick<Recipe, "id" | "slug" | "title"> | null;
  photos: MediaWithUrl[];
}

export interface InventoryItem {
  id: string;
  user_id: string;
  glaze_id: string;
  quantity_note: string | null;
  in_stock: boolean;
  favorite: boolean;
  notes: string | null;
  updated_at: string;
}

export interface InventoryItemWithGlaze extends InventoryItem {
  glaze: GlazeWithBrand;
}

export interface ImportExtraction {
  title?: string;
  brand_names?: string[];
  layers?: { glaze_name: string; brand_name?: string; coat_count?: number; coverage_area?: CoverageArea }[];
  cone?: number | null;
  atmosphere?: Atmosphere | null;
  clay_body?: string | null;
  effect_tags?: string[];
  color_tags?: string[];
  surface_tags?: string[];
  source_author?: string | null;
  source_date?: string | null;
  notes?: string | null;
}

export interface ImportDraft {
  id: string;
  user_id: string;
  status: "draft" | "approved" | "discarded";
  source_url: string | null;
  source_name: string | null;
  source_author: string | null;
  source_type: SourceType;
  raw_text: string | null;
  image_path: string | null;
  notes: string | null;
  extracted: ImportExtraction | null;
  recipe_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Editable layer used by the recipe/experiment editors and server actions. */
export interface LayerInput {
  glaze_id: string;
  coat_count: number;
  coverage_area: CoverageArea;
  coverage_percent: number | null;
  application_method: string | null;
  notes: string | null;
}
