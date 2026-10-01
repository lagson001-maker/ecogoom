import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Logo } from "@/components/layout/nav";
import { LoginForm } from "@/features/auth/login-form";
import { getViewer } from "@/lib/data/auth";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = { title: copy.nav.signIn };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const error = typeof sp.error === "string" ? sp.error : null;

  const viewer = await getViewer();
  if (viewer.userId) redirect(next);

  return (
    <div className="mx-auto max-w-md pt-4 md:pt-12">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-3 font-serif text-2xl font-semibold">{copy.auth.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{copy.app.tagline}</p>
      </div>
      <Card className="p-5 sm:p-6">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <LoginForm next={next} />
      </Card>
      <p className="mt-4 text-center text-xs text-muted">Browsing recipes doesn&apos;t require an account.</p>
    </div>
  );
}
