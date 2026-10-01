"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const t = copy.admin;

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: t.overview },
    { href: "/admin/brands", label: t.brands },
    { href: "/admin/glazes", label: t.glazes },
    { href: "/admin/recipes", label: t.recipes },
    { href: "/admin/imports", label: t.imports },
    { href: "/admin/sources", label: t.sources },
    ...(isAdmin ? [{ href: "/admin/users", label: t.users }] : []),
  ];
  return (
    <nav aria-label="Admin" className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium",
              active ? "border-clay text-clay-strong" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
