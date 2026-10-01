// Match extracted glaze names to real database glazes. Never invents a glaze:
// anything that doesn't match stays unmatched for the reviewer to resolve.

export interface MatchableGlaze {
  id: string;
  name: string;
  brand: string;
  code: string | null;
}

export interface ExtractedLayer {
  glaze_name: string;
  brand_name?: string | null;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function matchGlaze(layer: ExtractedLayer, glazes: MatchableGlaze[]): MatchableGlaze | null {
  const name = norm(layer.glaze_name);
  if (!name) return null;
  const brand = layer.brand_name ? norm(layer.brand_name) : null;
  const brandOk = (g: MatchableGlaze) => !brand || norm(g.brand).includes(brand) || brand.includes(norm(g.brand));

  const pool = glazes.filter(brandOk);
  const candidates = pool.length ? pool : glazes;

  // 1. Product code ("PC-33") or exact name.
  const exact = candidates.filter((g) => norm(g.name) === name || (g.code && norm(g.code) === name));
  if (exact.length === 1) return exact[0];

  // 2. Name contained in the text or vice versa ("AMACO Honey Flux PC-?").
  const partial = candidates.filter((g) => {
    const n = norm(g.name);
    return n.length >= 4 && (name.includes(n) || n.includes(name));
  });
  if (partial.length === 1) return partial[0];

  // Ambiguous or unknown: let the human decide.
  return null;
}
