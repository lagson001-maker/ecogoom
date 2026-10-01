import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { LevelMeter, VerificationBadge } from "@/features/recipes/badges";
import { RecipeVisual } from "@/features/recipes/recipe-card";
import { MiniStack } from "@/features/recipes/stack";
import { getViewer } from "@/lib/data/auth";
import { getRecipesByIds, getSavedRecipes } from "@/lib/data/recipes";
import { isUuid } from "@/lib/forms";
import { copy } from "@/lib/i18n";
import { ATMOSPHERES, humanizeTag } from "@/lib/vocabulary";
import type { RecipeSummary } from "@/types/domain";

export const metadata: Metadata = { title: copy.nav.compare };

const ROWS: { label: string; render: (r: RecipeSummary) => React.ReactNode }[] = [
  { label: "Glazes", render: (r) => Array.from(new Set(r.layers.map((l) => `${l.glaze.brand.name} ${l.glaze.name}`))).join(", ") },
  { label: "Layers", render: (r) => <MiniStack layers={r.layers} /> },
  { label: "Cone", render: (r) => r.cone ?? "?" },
  { label: "Atmosphere", render: (r) => ATMOSPHERES.find((a) => a.value === r.atmosphere)?.label ?? "?" },
  { label: "Clay", render: (r) => r.clay_body_text ?? "?" },
  { label: "Effects", render: (r) => [...r.effect_tags, ...r.surface_tags].map(humanizeTag).join(", ") || "—" },
  { label: "Movement", render: (r) => <LevelMeter value={r.movement_level} label="Movement" /> },
  { label: "Run risk", render: (r) => <LevelMeter value={r.run_risk} label="Run risk" /> },
  { label: "Evidence", render: (r) => <VerificationBadge status={r.verification_status} short /> },
];

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const ids = (typeof sp.ids === "string" ? sp.ids.split(",") : []).filter(isUuid).slice(0, 4);
  const viewer = await getViewer();
  const [recipes, saved] = await Promise.all([
    getRecipesByIds(ids),
    viewer.userId ? getSavedRecipes(viewer.userId) : Promise.resolve([]),
  ]);
  const candidates = saved.filter((r) => !ids.includes(r.id));
  const href = (list: string[]) => `/compare?ids=${list.join(",")}`;

  return (
    <>
      <PageHeader title={copy.nav.compare} subtitle="Compare 2–4 recipes side by side." />

      {recipes.length === 0 ? (
        <EmptyState title="Nothing to compare yet." description="Add recipes from your Saved list below, or use Compare on a recipe page." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <div
            className="grid min-w-full text-sm"
            style={{ gridTemplateColumns: `7rem repeat(${recipes.length}, minmax(10rem, 1fr))` }}
          >
            <div className="border-b border-line" />
            {recipes.map((r) => (
              <div key={r.id} className="border-b border-l border-line p-3">
                <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-surface-2">
                  <RecipeVisual recipe={r} sizes="240px" />
                </div>
                <div className="flex items-start justify-between gap-1">
                  <Link href={`/recipes/${r.slug}`} className="font-serif font-semibold hover:underline">
                    {r.title}
                  </Link>
                  <Link
                    href={href(ids.filter((x) => x !== r.id))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted hover:bg-surface-2"
                    aria-label={`Remove ${r.title} from comparison`}
                  >
                    <X className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
            {ROWS.map((row) => (
              <div key={row.label} className="contents">
                <div className="border-b border-line bg-surface-2 p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {row.label}
                </div>
                {recipes.map((r) => (
                  <div key={r.id} className="border-b border-l border-line p-3 text-ink-soft">
                    {row.render(r)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {ids.length < 4 && candidates.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-serif text-lg font-semibold">Add from Saved</h2>
          <div className="flex flex-wrap gap-2">
            {candidates.slice(0, 20).map((r) => (
              <Link key={r.id} href={href([...ids, r.id])} className={buttonClass("outline", "sm")}>
                + {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
