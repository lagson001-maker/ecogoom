import type { Metadata } from "next";
import { Heart, Palette, Sparkles } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Checkbox, Input } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { GlazeCard, GlazeGrid } from "@/features/inventory/glaze-card";
import { GlazeFilters } from "@/features/inventory/glaze-filters";
import { updateInventoryItem } from "@/features/inventory/actions";
import { requireUser } from "@/lib/data/auth";
import { getInventory } from "@/lib/data/personal";
import { listBrands, listSeries } from "@/lib/data/catalog";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = { title: copy.inventory.title };

export default async function MyGlazesPage({ searchParams }: PageProps<"/my-glazes">) {
  const viewer = await requireUser("/my-glazes");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : null);
  const f = { q: one("q"), brand: one("brand"), series: one("series"), color: one("color") };

  const [items, brands, series] = await Promise.all([getInventory(viewer.userId), listBrands(), listSeries()]);

  if (items.length === 0) {
    return (
      <>
        <PageHeader title={copy.inventory.title} subtitle={copy.inventory.subtitle} />
        <EmptyState
          icon={<Palette className="h-8 w-8" />}
          title="No glazes yet."
          description={copy.inventory.empty}
          actions={<LinkButton href="/glazes">{copy.inventory.browse}</LinkButton>}
        />
      </>
    );
  }

  const q = f.q?.toLowerCase();
  const filtered = items.filter(({ glaze: g }) => {
    if (f.brand && g.brand.slug !== f.brand) return false;
    if (f.series && g.series?.slug !== f.series) return false;
    if (f.color && g.color_family !== f.color && !g.color_tags.includes(f.color)) return false;
    if (q && ![g.name, g.product_code, g.base_color, g.brand.name].some((x) => x?.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title={copy.inventory.title}
        subtitle={`${items.length} glaze${items.length === 1 ? "" : "s"} · ${copy.inventory.swatchNote}`}
        actions={
          <>
            <LinkButton href="/glazes" variant="outline">
              {copy.inventory.browse}
            </LinkButton>
            <LinkButton href="/ask?mine=1">
              <Sparkles className="h-4 w-4" aria-hidden />
              Ask with My Glazes
            </LinkButton>
          </>
        }
      />
      <GlazeFilters action="/my-glazes" brands={brands} series={series} values={f} />
      <GlazeGrid>
        {filtered.map((item) => (
          <GlazeCard
            key={item.id}
            glaze={item.glaze}
            owned
            signedIn
            footer={
              <>
                {item.favorite && <Heart className="h-4 w-4 fill-clay text-clay" aria-label={copy.inventory.favorite} />}
                {item.quantity_note && <span className="text-xs text-muted">{item.quantity_note}</span>}
                {!item.in_stock && <span className="text-xs text-warn">out of stock</span>}
                <details className="relative z-10 w-full">
                  <summary className="cursor-pointer py-1 text-xs font-medium text-glaze">Details</summary>
                  <form action={updateInventoryItem} className="mt-2 flex flex-col gap-1">
                    <input type="hidden" name="id" value={item.id} />
                    <Input name="quantity_note" defaultValue={item.quantity_note ?? ""} placeholder={copy.inventory.quantity} aria-label={copy.inventory.quantity} />
                    <Input name="notes" defaultValue={item.notes ?? ""} placeholder="Notes" aria-label="Notes" />
                    <Checkbox name="favorite" label={copy.inventory.favorite} defaultChecked={item.favorite} />
                    <Checkbox name="in_stock" label={copy.inventory.inStock} defaultChecked={item.in_stock} />
                    <SubmitButton size="sm" variant="secondary">
                      {copy.common.save}
                    </SubmitButton>
                  </form>
                </details>
              </>
            }
          />
        ))}
      </GlazeGrid>
      {filtered.length === 0 && <p className="text-sm text-muted">{copy.discover.empty}</p>}
    </>
  );
}
