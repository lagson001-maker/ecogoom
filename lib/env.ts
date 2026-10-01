// Central env access. Public values are inlined at build time by Next.js, so
// they must be referenced with their literal names.

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);
}

/** Server-only AI settings. Never import from client components. */
export function aiEnv() {
  return {
    provider: (process.env.AI_PROVIDER ?? "").trim().toLowerCase(),
    model: (process.env.AI_MODEL ?? "").trim(),
    apiKey: (process.env.AI_API_KEY ?? "").trim(),
  };
}
