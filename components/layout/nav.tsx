"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Building2,
  Compass,
  FlaskConical,
  Import,
  Library,
  LinkIcon,
  Palette,
  Shield,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { copy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const primary: NavItem[] = [
  { href: "/", label: copy.nav.discover, icon: Compass },
  { href: "/ask", label: copy.nav.ask, icon: Sparkles },
  { href: "/lab", label: copy.nav.lab, icon: FlaskConical },
  { href: "/my-glazes", label: copy.nav.myGlazes, icon: Palette },
  { href: "/saved", label: copy.nav.saved, icon: Bookmark },
];

const secondary: NavItem[] = [
  { href: "/glazes", label: copy.nav.library, icon: Library },
  { href: "/brands", label: copy.nav.brands, icon: Building2 },
  { href: "/sources", label: copy.nav.sources, icon: LinkIcon },
  { href: "/import", label: copy.nav.import, icon: Import },
];

const mobile: NavItem[] = [
  { href: "/", label: copy.nav.discover, icon: Compass },
  { href: "/ask", label: copy.nav.askShort, icon: Sparkles },
  { href: "/lab", label: copy.nav.labShort, icon: FlaskConical },
  { href: "/my-glazes", label: copy.nav.glazesShort, icon: Palette },
  { href: "/profile", label: copy.nav.profile, icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/recipes");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SideLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-clay-soft text-clay-strong" : "text-ink-soft hover:bg-surface-2 hover:text-ink",
      )}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  signedIn,
  isEditor,
  displayName,
}: {
  signedIn: boolean;
  isEditor: boolean;
  displayName: string | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-3">
        <Logo />
        <span className="font-serif text-xl font-semibold tracking-tight">{copy.app.name}</span>
      </Link>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5">
        {primary.map((item) => (
          <SideLink key={item.href} item={item} pathname={pathname} />
        ))}
        <hr className="my-3 border-line" />
        {secondary.map((item) => (
          <SideLink key={item.href} item={item} pathname={pathname} />
        ))}
        {isEditor && (
          <>
            <hr className="my-3 border-line" />
            <SideLink item={{ href: "/admin", label: copy.nav.admin, icon: Shield }} pathname={pathname} />
          </>
        )}
      </nav>
      <div className="border-t border-line pt-3">
        {signedIn ? (
          <SideLink item={{ href: "/profile", label: displayName ?? copy.nav.profile, icon: UserRound }} pathname={pathname} />
        ) : (
          <SideLink item={{ href: "/login", label: copy.nav.signIn, icon: UserRound }} pathname={pathname} />
        )}
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {mobile.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-clay" : "text-muted",
                )}
              >
                <Icon className="h-[22px] w-[22px]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-bg/95 px-4 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Logo />
        <span className="font-serif text-lg font-semibold">{copy.app.name}</span>
      </Link>
    </header>
  );
}

/** Three stacked glaze layers on a tile. */
export function Logo() {
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden>
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#d9cbb7" />
      <path d="M2 8a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v4H2z" fill="#2b241f" />
      <path d="M2 12h24v3c-3 2-5-1-8 1s-5-1-8 1-5-1-8 0z" fill="#a4552f" />
      <path d="M2 17c3-1 5 2 8 0s5 1 8-1 5 1 8 0v3H2z" fill="#3d5f5b" opacity=".85" />
    </svg>
  );
}
