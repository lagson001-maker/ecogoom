import Link from "next/link";
import { coneLabel } from "@/lib/vocabulary";
import { InventoryButton } from "./inventory-button";
import type { GlazeWithBrand } from "@/types/domain";

/** Compact visual glaze card: big swatch, brand, code, name, series. */
export function GlazeCard({
  glaze,
  owned,
  signedIn,
  footer,
}: {
  glaze: GlazeWithBrand;
  owned: boolean;
  signedIn: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sm hover:shadow-md">
      <div className="relative h-20" style={{ background: glaze.swatch_hex ?? "#d9cbb7" }} aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/15" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {glaze.brand.name}
          {glaze.product_code && <span className="ml-1 normal-case tracking-normal">· {glaze.product_code}</span>}
        </p>
        <h3 className="font-serif font-semibold leading-snug text-ink">
          <Link href={`/glazes/${glaze.slug}`} className="after:absolute after:inset-0">
            {glaze.name}
          </Link>
        </h3>
        <p className="text-xs text-ink-soft">
          {[glaze.series?.name, glaze.finish, coneLabel(glaze.cone_min, glaze.cone_max)].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <InventoryButton glazeId={glaze.id} owned={owned} signedIn={signedIn} size="sm" />
          {footer}
        </div>
      </div>
    </article>
  );
}

export function GlazeGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}
