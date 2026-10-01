import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/types/domain";

export interface Viewer {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isEditor: boolean;
  isAdmin: boolean;
}

const anonymous: Viewer = { userId: null, email: null, profile: null, isEditor: false, isAdmin: false };

/** Current user + profile, memoized per request. Never throws. */
export const getViewer = cache(async (): Promise<Viewer> => {
  // Every page is per-user (RLS), so never prerender at build time.
  await connection();
  if (!isSupabaseConfigured()) return anonymous;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return anonymous;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
    const p = (profile as Profile | null) ?? null;
    return {
      userId: claims.sub,
      email: (claims.email as string | undefined) ?? null,
      profile: p,
      isEditor: p?.role === "editor" || p?.role === "admin",
      isAdmin: p?.role === "admin",
    };
  } catch {
    return anonymous;
  }
});

export async function requireUser(next = "/"): Promise<Viewer & { userId: string }> {
  const viewer = await getViewer();
  if (!viewer.userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer as Viewer & { userId: string };
}

export async function requireEditor(): Promise<Viewer & { userId: string }> {
  const viewer = await requireUser("/admin");
  if (!viewer.isEditor) redirect("/forbidden");
  return viewer;
}
