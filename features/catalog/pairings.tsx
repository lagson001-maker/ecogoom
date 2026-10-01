import Link from "next/link";
import { ArrowUpRight, Ban, Check, Layers2, Shuffle } from "lucide-react";
import { VerificationBadge } from "@/features/recipes/badges";
import { Swatch } from "@/features/recipes/stack";
import { sortPairings, type OrientedPairing } from "@/lib/pairings";
import { vocab } from "@/lib/vocabulary";
import type { Messages } from "@/lib/i18n";

/** "Works well with" and "Avoid with" lists for one glaze. */
export function PairingLists({ pairings, copy }: { pairings: OrientedPairing[]; copy: Messages }) {
  const t = copy.pairing;
  const good = sortPairings(pairings.filter((p) => p.pairing.verdict === "recommended"));
  const avoid = sortPairings(pairings.filter((p) => p.pairing.verdict === "avoid"));
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ok">
          <Check className="h-4 w-4" aria-hidden /> {t.recommended} ({good.length})
        </h3>
        {good.length ? <PairingList items={good} copy={copy} /> : <p className="text-sm text-muted">{t.noneRecommended}</p>}
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger">
          <Ban className="h-4 w-4" aria-hidden /> {t.avoid} ({avoid.length})
        </h3>
        {avoid.length ? <PairingList items={avoid} copy={copy} /> : <p className="text-sm text-muted">{t.noneAvoid}</p>}
      </div>
    </div>
  );
}

function PairingList({ items, copy }: { items: OrientedPairing[]; copy: Messages }) {
  const t = copy.pairing;
  const v = vocab(copy);
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {items.map(({ pairing: p, partner, arrangement, ratio }) => {
        const how =
          arrangement === "mix" && ratio
            ? t.mixWith(partner.name, `${ratio[0]} : ${ratio[1]}`)
            : arrangement === "over"
              ? t.overPartner(partner.name)
              : t.underPartner(partner.name);
        const Icon = arrangement === "mix" ? Shuffle : Layers2;
        return (
          <li key={p.id} className="p-3 text-sm">
            <div className="flex items-start gap-2">
              <Swatch hex={partner.swatch_hex} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  <Link href={`/glazes/${partner.slug}`} className="hover:underline">
                    {partner.name}
                  </Link>{" "}
                  <span className="font-normal text-muted">· {partner.brand.name}</span>
                </p>
                <p className="flex items-center gap-1 text-xs text-ink-soft">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {how}
                  {p.cone !== null && <span className="text-muted"> · {v.coneValue(p.cone)}</span>}
                </p>
              </div>
              {p.surface_rating !== null && (
                <span
                  className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-soft"
                  title={t.surfaceRating}
                  aria-label={`${t.surfaceRating}: ${p.surface_rating}/5`}
                >
                  {t.surfaceShort} {p.surface_rating}/5
                </span>
              )}
            </div>
            <p className="mt-1.5 text-ink-soft">{p.effect_description}</p>
            {p.reason && <p className="mt-1 text-xs text-muted">{t.why}: {p.reason}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <VerificationBadge status={p.verification_status} short />
              {p.source_url && (
                <a
                  href={p.source_url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="inline-flex items-center gap-0.5 text-glaze hover:underline"
                >
                  {copy.catalog.source} <ArrowUpRight className="h-3 w-3" aria-hidden />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
