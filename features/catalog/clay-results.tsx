import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { VerificationBadge } from "@/features/recipes/badges";
import { vocab } from "@/lib/vocabulary";
import type { Messages } from "@/lib/i18n";
import type { ClayResultWithSource } from "@/lib/data/catalog";

/** How one glaze turned out on different clay bodies. Every row shows its source. */
export function ClayResultList({ results, copy }: { results: ClayResultWithSource[]; copy: Messages }) {
  const v = vocab(copy);
  if (results.length === 0) return <p className="text-sm text-muted">{copy.catalog.noClayResults}</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {results.map((r) => {
        const sourceHref = r.source?.url ?? r.source_url;
        const firing = [
          r.cone !== null && v.coneValue(r.cone),
          r.cone !== null && v.celsius(r.cone),
          r.atmosphere && v.ATMOSPHERES.find((a) => a.value === r.atmosphere)?.label,
          r.coats !== null && v.coats(r.coats, r.coats),
        ].filter(Boolean);
        return (
          <li key={r.id} className="flex gap-3 p-3">
            {r.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- hotlinked third-party result photo
              <img
                src={r.image_url}
                alt={copy.catalog.resultOn(v.CLAY_COLORS.find((c) => c.value === r.clay_color)?.label ?? r.clay_color)}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-20 w-20 shrink-0 rounded-lg border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">
                {v.CLAY_COLORS.find((c) => c.value === r.clay_color)?.label}
                {r.clay_body_text && <span className="font-normal text-muted"> · {r.clay_body_text}</span>}
              </p>
              {firing.length > 0 && <p className="text-xs text-muted">{firing.join(" · ")}</p>}
              <p className="mt-1 text-ink-soft">{r.result_description}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <VerificationBadge status={r.verification_status} short />
                {r.source ? (
                  <Link href={`/sources/${r.source.id}`} className="text-glaze hover:underline">
                    {r.source.name}
                  </Link>
                ) : null}
                {sourceHref && (
                  <a
                    href={sourceHref}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="inline-flex items-center gap-0.5 text-glaze hover:underline"
                  >
                    {copy.catalog.source} <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
