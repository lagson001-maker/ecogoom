export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** URL-safe slug. Strips Vietnamese diacritics (đ -> d). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

/** Slug with a short random suffix, for user-generated rows where collisions are likely. */
export function uniqueSlug(input: string): string {
  return `${slugify(input).slice(0, 70)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
