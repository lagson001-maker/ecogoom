import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Recipe } from "@/types/domain";

export async function getAdminCounts() {
  const supabase = await createClient();
  const count = async (table: string, filter?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    let q = base(table);
    if (filter) q = filter(q);
    const { count: n } = await q;
    return n ?? 0;
  };
  function base(table: string) {
    return supabase.from(table).select("*", { count: "exact", head: true });
  }
  const [brands, glazes, published, drafts, sources] = await Promise.all([
    count("brands"),
    count("glazes"),
    count("recipes", (q) => q.eq("status", "published").eq("visibility", "public")),
    count("recipes", (q) => q.eq("status", "draft").eq("visibility", "public")),
    count("sources"),
  ]);
  return { brands, glazes, published, drafts, sources };
}

export async function listAdminRecipes(status?: string): Promise<Pick<Recipe, "id" | "slug" | "title" | "status" | "cone" | "layer_count" | "verification_status" | "updated_at">[]> {
  const supabase = await createClient();
  let q = supabase
    .from("recipes")
    .select("id, slug, title, status, cone, layer_count, verification_status, updated_at")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Pick<Recipe, "id" | "slug" | "title" | "status" | "cone" | "layer_count" | "verification_status" | "updated_at">[];
}

/** Visible only to admins via RLS. */
export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as Profile[];
}
