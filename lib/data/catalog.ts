import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GLAZE_JOIN, getRecipesUsingGlaze } from "./recipes";
import type { Brand, GlazeSeries, GlazeWithBrand, RecipeSummary } from "@/types/domain";

export interface GlazeFilters {
  q?: string | null;
  brand?: string | null;
  series?: string | null;
  color?: string | null;
  includeInactive?: boolean;
}

export async function listBrands(includeInactive = false): Promise<Brand[]> {
  const supabase = await createClient();
  let q = supabase.from("brands").select("*").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as Brand | null) ?? null;
}

export async function listSeries(brandId?: string): Promise<(GlazeSeries & { brand: Pick<Brand, "name" | "slug"> })[]> {
  const supabase = await createClient();
  let q = supabase.from("glaze_series").select("*, brand:brands(name,slug)").order("name");
  if (brandId) q = q.eq("brand_id", brandId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as (GlazeSeries & { brand: Pick<Brand, "name" | "slug"> })[];
}

export async function listGlazes(f: GlazeFilters = {}): Promise<GlazeWithBrand[]> {
  const supabase = await createClient();
  let q = supabase.from("glazes").select(GLAZE_JOIN).order("name").limit(500);
  if (!f.includeInactive) q = q.eq("active", true);
  if (f.brand) {
    const { data: b } = await supabase.from("brands").select("id").eq("slug", f.brand).maybeSingle();
    if (!b) return [];
    q = q.eq("brand_id", (b as { id: string }).id);
  }
  if (f.series) {
    const { data: s } = await supabase.from("glaze_series").select("id").eq("slug", f.series);
    const ids = (s ?? []).map((x: { id: string }) => x.id);
    if (ids.length === 0) return [];
    q = q.in("series_id", ids);
  }
  if (f.color) q = q.or(`color_family.eq.${f.color},color_tags.cs.{${f.color}}`);
  if (f.q) {
    const term = f.q.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
    if (term) q = q.or(`name.ilike.*${term}*,product_code.ilike.*${term}*,base_color.ilike.*${term}*`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GlazeWithBrand[];
}

export async function getGlazeBySlug(slug: string): Promise<GlazeWithBrand | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("glazes").select(GLAZE_JOIN).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as GlazeWithBrand | null) ?? null;
}

export async function getGlazeById(id: string): Promise<GlazeWithBrand | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("glazes").select(GLAZE_JOIN).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as GlazeWithBrand | null) ?? null;
}

export interface NeighborCount {
  glaze: GlazeWithBrand;
  count: number;
}

/** Recipes using a glaze + which glazes are most often directly above / below it. */
export async function getGlazeUsage(glazeId: string): Promise<{
  recipes: RecipeSummary[];
  above: NeighborCount[];
  below: NeighborCount[];
}> {
  const recipes = await getRecipesUsingGlaze(glazeId);
  const above = new Map<string, NeighborCount>();
  const below = new Map<string, NeighborCount>();
  for (const r of recipes) {
    r.layers.forEach((layer, i) => {
      if (layer.glaze_id !== glazeId) return;
      const up = r.layers[i + 1];
      const down = r.layers[i - 1];
      if (up && up.glaze_id !== glazeId) {
        const e = above.get(up.glaze_id) ?? { glaze: up.glaze, count: 0 };
        e.count++;
        above.set(up.glaze_id, e);
      }
      if (down && down.glaze_id !== glazeId) {
        const e = below.get(down.glaze_id) ?? { glaze: down.glaze, count: 0 };
        e.count++;
        below.set(down.glaze_id, e);
      }
    });
  }
  const top = (m: Map<string, NeighborCount>) => [...m.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  return {
    recipes: recipes.filter((r) => r.status === "published" || r.visibility === "private"),
    above: top(above),
    below: top(below),
  };
}

export async function countGlazesByBrand(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("glazes").select("brand_id").eq("active", true);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { brand_id: string }[]) counts.set(row.brand_id, (counts.get(row.brand_id) ?? 0) + 1);
  return counts;
}
