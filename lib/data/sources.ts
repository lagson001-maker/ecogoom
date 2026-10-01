import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRecipesByIds } from "./recipes";
import type { ImportDraft, RecipeSummary, Source } from "@/types/domain";

export async function listSources(): Promise<(Source & { recipe_count: number })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*, recipe_sources(count)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  type Row = Source & { recipe_sources: { count: number }[] };
  return ((data ?? []) as Row[]).map(({ recipe_sources, ...s }) => ({ ...s, recipe_count: recipe_sources?.[0]?.count ?? 0 }));
}

export async function getSource(id: string): Promise<{ source: Source; recipes: RecipeSummary[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: links } = await supabase.from("recipe_sources").select("recipe_id").eq("source_id", id);
  const recipes = await getRecipesByIds((links ?? []).map((l: { recipe_id: string }) => l.recipe_id));
  return { source: data as Source, recipes };
}

export async function listImportDrafts(userId: string, all = false): Promise<ImportDraft[]> {
  const supabase = await createClient();
  let q = supabase.from("import_drafts").select("*").order("created_at", { ascending: false }).limit(100);
  if (!all) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ImportDraft[];
}

export async function getImportDraft(id: string): Promise<ImportDraft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("import_drafts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ImportDraft | null) ?? null;
}
