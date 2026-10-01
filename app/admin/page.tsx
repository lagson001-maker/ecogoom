import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { getAdminCounts } from "@/lib/data/admin";
import { isAIConfigured } from "@/lib/ai";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.admin.title };
}

export default async function AdminPage() {
  const copy = await getCopy();
  const counts = await getAdminCounts();
  const stats = [
    { label: copy.admin.brands, value: counts.brands, href: "/admin/brands" },
    { label: copy.admin.glazes, value: counts.glazes, href: "/admin/glazes" },
    { label: copy.admin.publishedRecipes, value: counts.published, href: "/admin/recipes?status=published" },
    { label: copy.admin.draftRecipes, value: counts.drafts, href: "/admin/recipes?status=draft" },
    { label: copy.admin.sources, value: counts.sources, href: "/admin/sources" },
  ];
  return (
    <>
      <PageHeader
        title={copy.admin.title}
        actions={
          <>
            <LinkButton href="/recipes/new">
              <Plus className="h-4 w-4" aria-hidden /> {copy.editor.newRecipe}
            </LinkButton>
            <LinkButton href="/admin/glazes/new" variant="outline">
              <Plus className="h-4 w-4" aria-hidden /> {copy.glaze.newGlaze}
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
        AI: <strong>{isAIConfigured() ? copy.admin.aiOn : copy.admin.aiOff}</strong>. {copy.admin.aiNote}
      </p>
    </>
  );
}
