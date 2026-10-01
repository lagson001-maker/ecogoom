// Pairing rows are stored once, from glaze_id's side, and shown on both glazes.
// orientPairing() turns a row into "this glaze + partner" from either side.

import type { GlazePairing, GlazeWithBrand, PairingArrangement } from "@/types/domain";

export interface OrientedPairing {
  pairing: GlazePairing;
  partner: GlazeWithBrand;
  /** Arrangement from the viewed glaze's side: "over" = viewed glaze on top. */
  arrangement: PairingArrangement;
  /** Mix ratio as viewed glaze : partner. */
  ratio: [number, number] | null;
}

const FLIP: Record<PairingArrangement, PairingArrangement> = { over: "under", under: "over", mix: "mix" };

export function orientPairing(
  pairing: GlazePairing,
  viewedGlazeId: string,
  glazes: Map<string, GlazeWithBrand>,
): OrientedPairing | null {
  const fromOwnSide = pairing.glaze_id === viewedGlazeId;
  if (!fromOwnSide && pairing.other_glaze_id !== viewedGlazeId) return null;
  const partner = glazes.get(fromOwnSide ? pairing.other_glaze_id : pairing.glaze_id);
  if (!partner) return null;
  const ratio: [number, number] | null =
    pairing.ratio_glaze !== null && pairing.ratio_other !== null
      ? fromOwnSide
        ? [pairing.ratio_glaze, pairing.ratio_other]
        : [pairing.ratio_other, pairing.ratio_glaze]
      : null;
  return { pairing, partner, arrangement: fromOwnSide ? pairing.arrangement : FLIP[pairing.arrangement], ratio };
}

/** Best first: higher surface rating, stronger evidence, then partner name. */
const EVIDENCE_RANK = { unverified: 0, community_reported: 1, manufacturer_documented: 2, personally_tested: 3, repeated_test: 4 };
export function sortPairings(list: OrientedPairing[]): OrientedPairing[] {
  return [...list].sort(
    (a, b) =>
      (b.pairing.surface_rating ?? 0) - (a.pairing.surface_rating ?? 0) ||
      EVIDENCE_RANK[b.pairing.verification_status] - EVIDENCE_RANK[a.pairing.verification_status] ||
      a.partner.name.localeCompare(b.partner.name),
  );
}

/** Pairs inside a recipe that some source advises against (either order). */
export function avoidedPairsIn(glazeIds: string[], pairings: GlazePairing[]): GlazePairing[] {
  const ids = new Set(glazeIds);
  return pairings.filter((p) => p.verdict === "avoid" && ids.has(p.glaze_id) && ids.has(p.other_glaze_id));
}
