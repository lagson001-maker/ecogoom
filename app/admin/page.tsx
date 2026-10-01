import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { getAdminCounts } from "@/lib/data/admin";
import { isAIConfigured } from "@/lib/ai";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = { title: copy.admin.title };

export default async function AdminPage() {
  const counts = await getAdminCounts();
  const stats = [
    { label: "Brands", value: counts.brands, href: "/admin/brands" },
    { label: "Glazes", value: counts.glazes, href: "/admin/glazes" },
    { label: "Published recipes", value: counts.published, href: "/admin/recipes?status=published" },
    { label: "Draft recipes", value: counts.drafts, href: "/admin/recipes?status=draft" },
    { label: "Sources", value: counts.sources, href: "/admin/sources" },
  ];
  return (
    <>
      <PageHeader
        title={copy.admin.title}
        actions={
          <>
            <LinkButton href="/recipes/new">
              <Plus className="h-4 w-4" aria-hidden /> New recipe
            </LinkButton>
            <LinkButton href="/admin/glazes/new" variant="outline">
              <Plus className="h-4 w-4" aria-hidden /> New glaze
            </LinkButton>
            <LinkButton href="/import" variant="outline">
              {copy.nav.import}
            </LinkButton>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-4 hover:shadow-md">
              <p className="font-serif text-3xl font-semibold">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        AI: <strong>{isAIConfigured() ? "configured" : "not configured"}</strong>. Without it, search and recommendations use
        deterministic tag matching and imports are filled manually.
      </p>
    </>
  );
}
