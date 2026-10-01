// Canonical tag vocabulary shared by the editor, filters, search and the
// recommendation engine. Tags in the database are free text (open vocabulary),
// but the UI suggests — and the intent parser maps to — these canonical values.

import type {
  Atmosphere,
  ClayColor,
  CoverageArea,
  DinnerwareSuitability,
  ExperimentStatus,
  Opacity,
  SourceType,
  SuccessLevel,
  VerificationStatus,
} from "@/types/domain";
import type { DesiredSurface, MovementPreference, RiskTolerance } from "@/types/recommendation";

export const COLOR_TAGS = [
  "black", "white", "cream", "beige", "tan", "brown", "amber", "honey", "rust", "red",
  "burgundy", "plum", "purple", "pink", "blue", "indigo", "teal", "turquoise", "green",
  "olive", "moss", "sage", "celadon", "yellow", "orange", "gray", "bronze", "gold", "clear",
] as const;

/** Display-only approximations for color chips. Not fired-glaze colors. */
export const COLOR_CHIP_HEX: Record<string, string> = {
  black: "#1d1b1c", white: "#f4f1ea", cream: "#ece2c8", beige: "#d8c9a8", tan: "#c19a6b",
  brown: "#5b3a29", amber: "#b5772a", honey: "#c8902f", rust: "#9a4a23", red: "#9e2b25",
  burgundy: "#5e1f2e", plum: "#5f3a5c", purple: "#6b4c8a", pink: "#d99aa5", blue: "#36598a",
  indigo: "#2b3f6b", teal: "#2f7774", turquoise: "#3c9a98", green: "#4f7140", olive: "#6b6b2f",
  moss: "#5a6b3a", sage: "#9aa58a", celadon: "#a9c5a6", yellow: "#d9b43c", orange: "#cc6f2c",
  gray: "#8a8a88", bronze: "#7a5a35", gold: "#b8963c", clear: "#e9eef0",
};

export const EFFECT_TAGS = [
  "variegated", "breaking", "floating", "mottled", "speckled", "metallic", "crystalline",
  "galaxy", "ocean", "moss", "rust", "reactive", "gradient", "flowing", "dry", "satin", "glossy",
] as const;

export const SURFACE_TAGS = ["glossy", "satin", "matte", "metallic", "crystalline", "textured"] as const;

export const GLAZE_TYPES = [
  "glaze", "celadon", "shino", "flux", "wash", "crystal", "matte", "gloss", "satin", "crawl",
  "underglaze", "other",
] as const;

export const ATMOSPHERES: { value: Atmosphere; label: string }[] = [
  { value: "oxidation", label: "Oxidation" },
  { value: "reduction", label: "Reduction" },
  { value: "neutral", label: "Neutral" },
  { value: "wood", label: "Wood" },
  { value: "soda", label: "Soda" },
  { value: "salt", label: "Salt" },
  { value: "raku", label: "Raku" },
  { value: "unknown", label: "Unknown" },
];

export const CLAY_COLORS: { value: ClayColor; label: string }[] = [
  { value: "white", label: "White stoneware" },
  { value: "porcelain", label: "Porcelain" },
  { value: "buff", label: "Buff" },
  { value: "speckled", label: "Speckled" },
  { value: "brown", label: "Brown" },
  { value: "red", label: "Red" },
  { value: "dark", label: "Dark / black" },
  { value: "other", label: "Other" },
];

export const COVERAGE_AREAS: { value: CoverageArea; label: string }[] = [
  { value: "full", label: "Full coverage" },
  { value: "upper_half", label: "Upper half" },
  { value: "upper_third", label: "Upper third" },
  { value: "rim_only", label: "Rim only" },
  { value: "overlap", label: "Overlap band" },
  { value: "brush_detail", label: "Brush detail" },
  { value: "custom", label: "Custom" },
];

export const OPACITIES: Opacity[] = ["transparent", "translucent", "semi-opaque", "opaque"];

export const CONES = [-6, -4, 4, 5, 6, 7, 8, 9, 10, 11];

export const VERIFICATION: Record<VerificationStatus, { label: string; short: string; rank: number }> = {
  unverified: { label: "Unverified", short: "Unverified", rank: 0 },
  community_reported: { label: "Community tested", short: "Community", rank: 1 },
  manufacturer_documented: { label: "Manufacturer documented", short: "Manufacturer", rank: 2 },
  personally_tested: { label: "Personally tested", short: "Tested", rank: 3 },
  repeated_test: { label: "Repeated tests", short: "Repeated", rank: 4 },
};

export const SOURCE_TYPES: Record<SourceType, string> = {
  manufacturer: "Manufacturer",
  community: "Community",
  personal: "Personal",
  imported: "Imported",
  unknown: "Unknown",
};

export const DINNERWARE: Record<DinnerwareSuitability, { label: string; hint: string }> = {
  verified: { label: "Verified", hint: "Lab-tested for this exact combination." },
  manufacturer_guidance: { label: "Manufacturer guidance", hint: "Based on manufacturer statements; layering can change results." },
  unknown: { label: "Unknown", hint: "No evidence recorded. Layered glazes are not automatically food-safe." },
  not_recommended: { label: "Not recommended", hint: "Do not use on food surfaces." },
};

export const EXPERIMENT_STATUS: Record<ExperimentStatus, string> = {
  in_progress: "In progress",
  waiting_firing: "Waiting for firing",
  completed: "Completed",
};

export const SUCCESS_LEVELS: Record<SuccessLevel, string> = {
  success: "Success",
  partial: "Partial",
  failure: "Failed",
};

/** Observed-result tags offered in the experiment form (in addition to effects). */
export const RESULT_TAGS = ["too_runny", "crawled", "pinholes", "blistered", "underfired", "overfired", "great_break", "keeper"] as const;

export const DESIRED_SURFACES: { value: DesiredSurface; label: string; tags: string[] }[] = [
  { value: "gloss", label: "Gloss", tags: ["glossy"] },
  { value: "matte", label: "Matte", tags: ["matte", "dry"] },
  { value: "satin", label: "Satin", tags: ["satin"] },
  { value: "metallic", label: "Metallic", tags: ["metallic"] },
  { value: "crystal", label: "Crystal", tags: ["crystalline"] },
  { value: "reactive", label: "Reactive", tags: ["reactive", "variegated", "breaking"] },
];

export const MOVEMENT_PREFERENCES: { value: MovementPreference; label: string; range: [number, number] }[] = [
  { value: "stable", label: "Stable", range: [0, 1] },
  { value: "slight", label: "Slight", range: [1, 2] },
  { value: "medium", label: "Medium", range: [2, 3] },
  { value: "flowing", label: "Flowing", range: [3, 5] },
];

export const RISK_TOLERANCES: { value: RiskTolerance; label: string; maxRunRisk: number }[] = [
  { value: "low", label: "Low", maxRunRisk: 2 },
  { value: "medium", label: "Medium", maxRunRisk: 3 },
  { value: "experimental", label: "Experimental", maxRunRisk: 5 },
];

export function riskLevel(value: number | null | undefined): "low" | "medium" | "high" | "unknown" {
  if (value === null || value === undefined) return "unknown";
  if (value <= 1) return "low";
  if (value <= 3) return "medium";
  return "high";
}

export function humanizeTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

export function coverageLabel(area: CoverageArea, percent: number | null): string {
  const base = COVERAGE_AREAS.find((c) => c.value === area)?.label ?? area;
  return percent && area !== "full" ? `${base} (~${percent}%)` : base;
}

export function coneLabel(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Cone ?";
  if (min === max || max === null) return `Cone ${min}`;
  if (min === null) return `Cone ${max}`;
  return `Cone ${min}–${max}`;
}

// ---------------------------------------------------------------------------
// Natural-language lexicon (EN + VI). Each phrase expands to tags.
// Matching is longest-phrase-first so "xanh rêu" wins over "xanh".
// ---------------------------------------------------------------------------

export interface LexiconEntry {
  colors?: string[];
  effects?: string[];
  surfaces?: string[];
  movement?: MovementPreference;
}

export const LEXICON: Record<string, LexiconEntry> = {
  // --- colors, English
  black: { colors: ["black"] }, white: { colors: ["white"] }, cream: { colors: ["cream"] },
  beige: { colors: ["beige"] }, tan: { colors: ["tan"] }, brown: { colors: ["brown"] },
  amber: { colors: ["amber"] }, honey: { colors: ["honey", "amber"] }, rust: { colors: ["rust"], effects: ["rust"] },
  red: { colors: ["red"] }, burgundy: { colors: ["burgundy"] }, wine: { colors: ["burgundy"] },
  plum: { colors: ["plum", "purple"] }, purple: { colors: ["purple"] }, violet: { colors: ["purple"] },
  pink: { colors: ["pink"] }, blue: { colors: ["blue"] }, navy: { colors: ["indigo", "blue"] },
  indigo: { colors: ["indigo", "blue"] }, teal: { colors: ["teal"] }, turquoise: { colors: ["turquoise", "teal"] },
  green: { colors: ["green"] }, olive: { colors: ["olive", "green"] }, moss: { colors: ["moss", "olive", "green"], effects: ["moss"] },
  sage: { colors: ["sage", "green"] }, celadon: { colors: ["celadon", "green"] }, jade: { colors: ["celadon", "green"] },
  yellow: { colors: ["yellow"] }, orange: { colors: ["orange"] }, gray: { colors: ["gray"] }, grey: { colors: ["gray"] },
  bronze: { colors: ["bronze"], effects: ["metallic"] }, gold: { colors: ["gold"] }, clear: { colors: ["clear"] },
  dark: { colors: ["black", "brown", "indigo", "plum"] },
  earthy: { colors: ["brown", "olive", "rust", "tan"] },
  "earth tone": { colors: ["brown", "olive", "rust", "tan"] },
  // --- effects / surfaces, English
  variegated: { effects: ["variegated"] }, breaking: { effects: ["breaking"] }, "breaks": { effects: ["breaking"] },
  floating: { effects: ["floating"] }, mottled: { effects: ["mottled"] }, speckled: { effects: ["speckled"] },
  metallic: { effects: ["metallic"], surfaces: ["metallic"] }, crystalline: { effects: ["crystalline"], surfaces: ["crystalline"] },
  crystal: { effects: ["crystalline"] }, galaxy: { effects: ["galaxy", "floating"] }, ocean: { effects: ["ocean"] },
  reactive: { effects: ["reactive", "variegated"] }, gradient: { effects: ["gradient"] }, ombre: { effects: ["gradient"] },
  flowing: { effects: ["flowing"], movement: "flowing" }, drippy: { effects: ["flowing"], movement: "flowing" },
  runny: { effects: ["flowing"], movement: "flowing" },
  "slight movement": { movement: "slight" }, "slightly runny": { movement: "slight" }, "a little movement": { movement: "slight" },
  stable: { movement: "stable" }, "no movement": { movement: "stable" }, "doesn't run": { movement: "stable" },
  glossy: { surfaces: ["glossy"] }, gloss: { surfaces: ["glossy"] }, shiny: { surfaces: ["glossy"] },
  matte: { surfaces: ["matte"] }, matt: { surfaces: ["matte"] }, satin: { surfaces: ["satin"] },
  dry: { surfaces: ["matte"], effects: ["dry"] }, textured: { surfaces: ["textured"] },
  vintage: { effects: ["breaking", "speckled"], colors: ["brown", "beige"] },
  rustic: { effects: ["breaking", "speckled"], colors: ["brown"] },
  antique: { effects: ["breaking"], colors: ["brown"] },

  // --- Vietnamese colors (diacritics required to avoid collisions)
  "đen": { colors: ["black"] }, "trắng": { colors: ["white"] }, "kem": { colors: ["cream"] },
  "màu be": { colors: ["beige"] }, "nâu": { colors: ["brown"] },
  "nâu cháy": { colors: ["brown", "rust"] }, "nâu đỏ": { colors: ["brown", "rust"] },
  "hổ phách": { colors: ["amber"] }, "mật ong": { colors: ["honey", "amber"] },
  "gỉ sắt": { colors: ["rust"], effects: ["rust"] }, "màu gỉ": { colors: ["rust"], effects: ["rust"] },
  "đỏ": { colors: ["red"] }, "đỏ rượu": { colors: ["burgundy"] }, "đỏ gạch": { colors: ["red", "rust"] },
  "tím": { colors: ["purple"] }, "tím mận": { colors: ["plum", "purple"] }, "hồng": { colors: ["pink"] },
  "xanh": { colors: ["blue", "green"] },
  "xanh dương": { colors: ["blue"] }, "xanh lam": { colors: ["blue"] }, "xanh biển": { colors: ["blue"] },
  "xanh navy": { colors: ["indigo", "blue"] }, "chàm": { colors: ["indigo", "blue"] },
  "xanh ngọc": { colors: ["turquoise", "teal"] }, "xanh lá": { colors: ["green"] },
  "xanh rêu": { colors: ["moss", "olive", "green"], effects: ["moss"] }, "rêu": { colors: ["moss", "green"], effects: ["moss"] },
  "xanh olive": { colors: ["olive", "green"] }, "ô liu": { colors: ["olive", "green"] },
  "xanh ngọc bích": { colors: ["celadon", "green"] }, "men ngọc": { colors: ["celadon", "green"] },
  "vàng": { colors: ["yellow", "amber"] }, "cam": { colors: ["orange"] }, "xám": { colors: ["gray"] }, "ghi": { colors: ["gray"] },
  "ánh đồng": { colors: ["bronze"], effects: ["metallic"] },
  "tối": { colors: ["black", "brown", "indigo", "plum"] }, "sẫm": { colors: ["black", "brown"] },
  "màu đất": { colors: ["brown", "olive", "rust", "tan"] },
  // --- Vietnamese effects / surfaces / movement
  "loang": { effects: ["variegated", "mottled"] }, "loang lổ": { effects: ["mottled", "variegated"] },
  "biến màu": { effects: ["reactive", "variegated"] }, "phản ứng": { effects: ["reactive"] },
  "lộ cạnh": { effects: ["breaking"] }, "ở cạnh": { effects: ["breaking"] },
  "đốm": { effects: ["speckled"] }, "lấm tấm": { effects: ["speckled"] },
  "ánh kim": { effects: ["metallic"], surfaces: ["metallic"] }, "kim loại": { effects: ["metallic"], surfaces: ["metallic"] },
  "tinh thể": { effects: ["crystalline"], surfaces: ["crystalline"] }, "thiên hà": { effects: ["galaxy", "floating"] },
  "đại dương": { effects: ["ocean"] }, "chuyển màu": { effects: ["gradient"] },
  "chảy": { effects: ["flowing"], movement: "medium" }, "chảy nhiều": { effects: ["flowing"], movement: "flowing" },
  "chảy nhẹ": { movement: "slight" }, "hơi chảy": { movement: "slight" },
  "không chảy": { movement: "stable" }, "ổn định": { movement: "stable" },
  "bóng": { surfaces: ["glossy"] }, "mờ": { surfaces: ["matte"] }, "lì": { surfaces: ["matte"] },
  "bán bóng": { surfaces: ["satin"] }, "khô": { surfaces: ["matte"], effects: ["dry"] },
  "cổ": { effects: ["breaking"], colors: ["brown"] }, "cổ điển": { effects: ["breaking", "speckled"], colors: ["brown"] },
  "mộc": { effects: ["speckled"], surfaces: ["matte"] },
};

/** Words that flip the next color phrase into an "avoid" color. */
export const NEGATION_WORDS = ["no", "not", "avoid", "without", "không", "tránh", "trừ", "không muốn"];
