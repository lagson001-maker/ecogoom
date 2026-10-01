import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Building2, ChevronRight, Import, Library, LinkIcon, LogIn, LogOut, Shield } from "lucide-react";
import { Card, PageHeader, Section } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProfileForm } from "@/features/auth/profile-form";
import { signOut } from "@/features/auth/actions";
import { getViewer } from "@/lib/data/auth";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = { title: copy.nav.profile };

export default async function ProfilePage() {
  const viewer = await getViewer();

  const links = [
    { href: "/saved", label: copy.nav.saved, icon: Bookmark },
    { href: "/glazes", label: copy.nav.library, icon: Library },
    { href: "/brands", label: copy.nav.brands, icon: Building2 },
    { href: "/sources", label: copy.nav.sources, icon: LinkIcon },
    { href: "/import", label: copy.nav.import, icon: Import },
    ...(viewer.isEditor ? [{ href: "/admin", label: copy.nav.admin, icon: Shield }] : []),
  ];

  return (
    <>
      <PageHeader
        title={viewer.userId ? (viewer.profile?.display_name ?? copy.nav.profile) : copy.nav.profile}
        subtitle={viewer.userId ? `${viewer.email ?? ""} · role: ${viewer.profile?.role ?? "user"}` : undefined}
      />

      {!viewer.userId && (
        <LinkButton href="/login?next=/profile" size="lg" className="mb-6 w-full sm:w-auto">
          <LogIn className="h-4 w-4" aria-hidden />
          {copy.nav.signIn}
        </LinkButton>
      )}

      <nav aria-label="More">
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
                <Icon className="h-5 w-5 text-muted" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {viewer.userId && (
        <>
          <Section title="Account">
            <Card className="max-w-md p-4">
              <ProfileForm displayName={viewer.profile?.display_name ?? ""} />
            </Card>
          </Section>
          <form action={signOut} className="mt-6">
            <SubmitButton variant="outline">
              <LogOut className="h-4 w-4" aria-hidden />
              {copy.nav.signOut}
            </SubmitButton>
          </form>
        </>
      )}
    </>
  );
}
