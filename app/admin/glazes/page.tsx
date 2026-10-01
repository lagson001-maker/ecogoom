import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { Swatch } from "@/features/recipes/stack";
import { listGlazes } from "@/lib/data/catalog";
import { getCopy } from "@/lib/i18n/server";
import { vocab } from "@/lib/vocabulary";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.admin.glazes };
}

export default async function AdminGlazesPage({ searchParams }: PageProps<"/admin/glazes">) {
  const copy = await getCopy();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : null;
  const glazes = await listGlazes({ q, includeInactive: true });
  return (
    <>
      <PageHeader
        title={copy.admin.glazes}
        actions={
          <LinkButton href="/admin/glazes/new">
            <Plus className="h-4 w-4" aria-hidden /> {copy.glaze.newGlaze}
          </LinkButton>
        }
      />
      <form className="mb-4" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder={copy.admin.searchGlazes}
          aria-label={copy.admin.searchGlazes}
          className="h-11 w-full max-w-sm rounded-lg border border-line-strong bg-surface px-3"
        />
      </form>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {glazes.map((g) => (
          <li key={g.id}>
            <Link href={`/admin/glazes/${g.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2">
              <Swatch hex={g.swatch_hex} />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{g.name}</span>{" "}
                <span className="text-sm text-muted">
                  {g.brand.name}
                  {g.product_code && ` · ${g.product_code}`}
                  {g.series && ` · ${g.series.name}`}
                </span>
              </span>
              <span className="hidden text-xs text-muted sm:inline">{vocab(copy).coneLabel(g.cone_min, g.cone_max)}</span>
              {!g.active && <span className="text-xs text-warn">{copy.admin.inactive}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
