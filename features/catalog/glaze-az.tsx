import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { InventoryButton } from "@/features/inventory/inventory-button";
import { Swatch } from "@/features/recipes/stack";
import { ClayResultList } from "./clay-results";
import { GlazeImage } from "./glaze-image";
import { vocab } from "@/lib/vocabulary";
import type { Messages } from "@/lib/i18n";
import type { ClayResultWithSource } from "@/lib/data/catalog";
import type { GlazeWithBrand } from "@/types/domain";

/** "A"–"Z" from the first letter (diacritics folded); anything else under "#". */
export function letterOf(name: string): string {
  const c = name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

export function groupByLetter(glazes: GlazeWithBrand[]): [string, GlazeWithBrand[]][] {
  const sorted = [...glazes].sort(
    (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.brand.name.localeCompare(b.brand.name),
  );
  const groups = new Map<string, GlazeWithBrand[]>();
  for (const g of sorted) groups.set(letterOf(g.name), [...(groups.get(letterOf(g.name)) ?? []), g]);
  return [...groups.entries()].sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

/** Alphabetical catalog. Each glaze is a disclosure row that expands into its full profile. */
export function GlazeAZ({
  glazes,
  clayResults,
  owned,
  signedIn,
  copy,
}: {
  glazes: GlazeWithBrand[];
  clayResults: Map<string, ClayResultWithSource[]>;
  owned: Set<string>;
  signedIn: boolean;
  copy: Messages;
}) {
  const groups = groupByLetter(glazes);
  const present = new Set(groups.map(([l]) => l));
  return (
    <>
      <nav
        aria-label={copy.catalog.letterIndex}
        className="sticky top-14 z-10 -mx-4 mb-4 flex gap-0.5 overflow-x-auto bg-bg/95 px-4 py-2 backdrop-blur md:top-0"
      >
        {ALPHABET.map((l) =>
          present.has(l) ? (
            <a
              key={l}
              href={`#letter-${l === "#" ? "other" : l}`}
              className="flex h-8 min-w-8 items-center justify-center rounded-md text-sm font-semibold text-ink hover:bg-surface-2"
            >
              {l}
            </a>
          ) : (
            <span key={l} className="flex h-8 min-w-8 items-center justify-center text-sm text-line-strong" aria-hidden>
              {l}
            </span>
          ),
        )}
      </nav>

      <div className="space-y-6">
        {groups.map(([letter, items]) => (
          <section key={letter} id={`letter-${letter === "#" ? "other" : letter}`} className="scroll-mt-28 md:scroll-mt-16">
            <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">{letter}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {items.map((g) => (
                <li key={g.id}>
                  <GlazeRow
                    glaze={g}
                    results={clayResults.get(g.id) ?? []}
                    owned={owned.has(g.id)}
                    signedIn={signedIn}
                    copy={copy}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function GlazeRow({
  glaze: g,
  results,
  owned,
  signedIn,
  copy,
}: {
  glaze: GlazeWithBrand;
  results: ClayResultWithSource[];
  owned: boolean;
  signedIn: boolean;
  copy: Messages;
}) {
  const v = vocab(copy);
  const t = copy.catalog;
  const celsius = v.celsius(g.cone_min, g.cone_max);
  const coats = v.coats(g.coats_min, g.coats_max);
  return (
    <details className="group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <Swatch hex={g.swatch_hex} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{g.name}</span>
          <span className="block truncate text-xs text-muted">
            {[g.brand.name, g.product_code, g.series?.name].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="hidden shrink-0 text-right text-xs text-ink-soft sm:block">
          {v.coneLabel(g.cone_min, g.cone_max)}
          {celsius && <span className="block text-muted">{celsius}</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="grid gap-5 border-t border-line bg-bg/40 p-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <GlazeImage glaze={g} copy={copy} />

        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Fact label={copy.glaze.baseColor}>
              {[g.base_color, g.color_tags.length ? v.tags(g.color_tags) : null].filter(Boolean).join(" — ") ||
                copy.common.unknown}
            </Fact>
            <Fact label={copy.glaze.finish}>
              {[g.finish && v.tag(g.finish), g.opacity && v.opacity(g.opacity)].filter(Boolean).join(" · ") ||
                copy.common.unknown}
            </Fact>
            <Fact label={t.firing}>
              {v.coneLabel(g.cone_min, g.cone_max)}
              {celsius && <span className="text-muted"> · {celsius}</span>}
            </Fact>
            <Fact label={t.recommendedCoats}>{coats ?? <span className="text-muted">{t.noStatement}</span>}</Fact>
          </dl>

          {g.application_notes && (
            <div className="text-sm">
              <p className="font-medium text-ink">{t.applicationNotes}</p>
              <p className="text-ink-soft">{g.application_notes}</p>
            </div>
          )}
          {g.manufacturer_notes && (
            <div className="text-sm">
              <p className="font-medium text-ink">{copy.glaze.manufacturerNotes}</p>
              <p className="text-ink-soft">{g.manufacturer_notes}</p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">{t.onClayBodies}</p>
            <ClayResultList results={results} copy={copy} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/glazes/${g.slug}`} className={buttonClass("primary", "sm")}>
              {t.fullProfile}
            </Link>
            <Link href={`/?glaze=${g.slug}`} className={buttonClass("outline", "sm")}>
              {copy.glaze.recipesWith}
            </Link>
            <InventoryButton glazeId={g.id} owned={owned} signedIn={signedIn} size="sm" />
            {g.official_url && (
              <a
                href={g.official_url}
                target="_blank"
                rel="noreferrer nofollow"
                className="inline-flex items-center gap-1 px-1 text-sm text-glaze hover:underline"
              >
                {copy.glaze.officialPage} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-ink-soft">{children}</dd>
    </div>
  );
}
