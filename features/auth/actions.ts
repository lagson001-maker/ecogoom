"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { publicEnv } from "@/lib/env";
import { str, type ActionState } from "@/lib/forms";
import { getCopy } from "@/lib/i18n/server";

/** Only same-site relative redirects. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

async function siteOrigin(): Promise<string> {
  if (publicEnv.siteUrl) return publicEnv.siteUrl.replace(/\/$/, "");
  if (process.env.URL) return process.env.URL.replace(/\/$/, ""); // Netlify
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function authAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  const mode = str(fd, "mode") ?? "signin";
  const email = str(fd, "email", 320);
  const password = str(fd, "password", 200);
  const next = safeNext(str(fd, "next"));
  if (!email) return { ok: false, message: copy.auth.emailRequired, fieldErrors: { email: copy.auth.emailRequired } };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const callback = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;

  if (mode === "magic") {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback } });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: copy.auth.magicSent };
  }

  if (!password || password.length < 8) {
    return { ok: false, message: copy.auth.passwordTooShort, fieldErrors: { password: copy.auth.passwordHint } };
  }

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
    if (error) return { ok: false, message: error.message };
    if (!data.session) return { ok: true, message: copy.auth.signUpSent };
    redirect(next);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  const viewer = await getViewer();
  if (!viewer.userId) return { ok: false, message: copy.auth.required };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: str(fd, "display_name", 80) })
    .eq("id", viewer.userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: copy.profile.saved };
}
