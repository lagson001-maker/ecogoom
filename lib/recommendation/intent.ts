// Deterministic natural-language -> VisualIntent parser (EN + VI).
// Used directly when no AI is configured, and as a safety net when it is.

import { LEXICON, NEGATION_WORDS, type LexiconEntry } from "@/lib/vocabulary";
import type { MovementPreference, VisualIntent } from "@/types/recommendation";

const STOPWORDS = new Set([
  // en
  "the", "and", "with", "for", "but", "that", "want", "like", "looking", "some", "very", "too", "much",
  "glaze", "glazes", "combo", "combination", "recipe", "something", "please", "edge", "edges", "over",
  "under", "little", "bit", "more", "less", "would", "should", "have", "into", "from", "this", "not",
  // vi
  "tôi", "muốn", "men", "màu", "có", "và", "nhưng", "hơi", "pha", "một", "chút", "quá", "nhiều", "ít",
  "kiểu", "giống", "như", "cần", "cho", "với", "được", "mạnh", "rất", "là", "của", "phần", "cạnh", "ở",
  "trên", "dưới", "lớp", "ánh", "không", "tránh",
]);

const PHRASES = Object.keys(LEXICON).sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PHRASE_PATTERNS = PHRASES.map((phrase) => ({
  phrase,
  re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`, "gu"),
}));

const NEGATION_RE = new RegExp(
  `(?:^|[^\\p{L}])(?:${NEGATION_WORDS.map(escapeRegExp).join("|")})\\s+(?:\\p{L}+\\s+)?$`,
  "u",
);

export function normalizeText(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

interface Match {
  index: number;
  length: number;
  entry: LexiconEntry;
  negated: boolean;
}

export function emptyIntent(): VisualIntent {
  return {
    dominant_colors: [],
    secondary_colors: [],
    surface: [],
    effect_tags: [],
    avoid_colors: [],
    movement: null,
    unmatched_terms: [],
  };
}

const uniq = <T,>(xs: T[]): T[] => Array.from(new Set(xs));

export function parseTextIntent(input: string): VisualIntent {
  const text = normalizeText(input);
  if (!text) return emptyIntent();

  let working = text;
  const matches: Match[] = [];

  for (const { phrase, re } of PHRASE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(working)) !== null) {
      const before = working.slice(Math.max(0, m.index - 24), m.index);
      matches.push({
        index: m.index,
        length: phrase.length,
        entry: LEXICON[phrase],
        // Checked against `working`, where longer phrases such as "không chảy"
        // are already blanked out, so they don't negate what follows.
        negated: NEGATION_RE.test(before),
      });
    }
    // Consume matched text so shorter phrases don't re-match inside it.
    working = working.replace(re, (s) => " ".repeat(s.length));
  }

  matches.sort((a, b) => a.index - b.index);

  const intent = emptyIntent();
  let movementFrom = -1;
  let colorPhraseCount = 0;

  for (const { entry, negated, length } of matches) {
    if (entry.colors?.length) {
      if (negated) {
        intent.avoid_colors.push(...entry.colors);
      } else {
        // The first two color phrases describe the main palette.
        (colorPhraseCount < 2 ? intent.dominant_colors : intent.secondary_colors).push(...entry.colors);
        colorPhraseCount++;
      }
    }
    if (entry.effects?.length && !negated) intent.effect_tags.push(...entry.effects);
    if (entry.surfaces?.length && !negated) intent.surface.push(...entry.surfaces);
    // The most specific (longest) movement phrase wins.
    if (entry.movement && length > movementFrom) {
      intent.movement = entry.movement;
      movementFrom = length;
    }
  }

  intent.dominant_colors = uniq(intent.dominant_colors);
  intent.secondary_colors = uniq(intent.secondary_colors).filter((c) => !intent.dominant_colors.includes(c));
  intent.avoid_colors = uniq(intent.avoid_colors).filter(
    (c) => !intent.dominant_colors.includes(c) && !intent.secondary_colors.includes(c),
  );
  intent.effect_tags = uniq(intent.effect_tags);
  intent.surface = uniq(intent.surface);
  intent.unmatched_terms = uniq(
    working
      .split(/[^\p{L}\p{N}-]+/u)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );

  return intent;
}

/** Merge several intents (e.g. text + image analysis). Earlier ones take priority. */
export function mergeIntents(...intents: (VisualIntent | null | undefined)[]): VisualIntent {
  const result = emptyIntent();
  for (const i of intents) {
    if (!i) continue;
    result.dominant_colors.push(...i.dominant_colors);
    result.secondary_colors.push(...i.secondary_colors);
    result.surface.push(...i.surface);
    result.effect_tags.push(...i.effect_tags);
    result.avoid_colors.push(...i.avoid_colors);
    result.unmatched_terms.push(...i.unmatched_terms);
    result.uncertainty = [...(result.uncertainty ?? []), ...(i.uncertainty ?? [])];
    if (!result.movement && i.movement) result.movement = i.movement;
    if (!result.contrast && i.contrast) result.contrast = i.contrast;
    if (!result.description && i.description) result.description = i.description;
  }
  result.dominant_colors = uniq(result.dominant_colors);
  result.secondary_colors = uniq(result.secondary_colors).filter((c) => !result.dominant_colors.includes(c));
  result.surface = uniq(result.surface);
  result.effect_tags = uniq(result.effect_tags);
  result.avoid_colors = uniq(result.avoid_colors).filter(
    (c) => !result.dominant_colors.includes(c) && !result.secondary_colors.includes(c),
  );
  result.unmatched_terms = uniq(result.unmatched_terms);
  return result;
}

export function intentHasSignals(intent: VisualIntent): boolean {
  return (
    intent.dominant_colors.length + intent.secondary_colors.length + intent.surface.length +
      intent.effect_tags.length > 0 || intent.movement !== null
  );
}

/** All tags a search should look for (used by Discover keyword search). */
export function intentTags(intent: VisualIntent): string[] {
  return uniq([...intent.dominant_colors, ...intent.secondary_colors, ...intent.surface, ...intent.effect_tags]);
}

export const MOVEMENT_ORDER: MovementPreference[] = ["stable", "slight", "medium", "flowing"];
