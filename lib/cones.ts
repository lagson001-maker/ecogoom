// Approximate firing temperatures for the cones the app offers.
//
// Orton self-supporting cones at a 60 °C/h heating rate over the final 100 °C.
// Cones measure heat-work (time × temperature), so these are equivalents, not
// set points. Cones without a value we could confirm are left out on purpose
// and render as "Cone N" only.
// Sources: Orton Ceramic Foundation cone chart (ortonceramic.com/resources/pyrometric_cones),
// The Ceramic Shop Orton chart, nmclay.com Orton chart in °C.

export const CONE_CELSIUS: Readonly<Record<number, number>> = {
  [-6]: 998,
  [-4]: 1063,
  4: 1162,
  5: 1186,
  6: 1222,
  7: 1239,
  8: 1249,
  9: 1260,
  10: 1285,
};

/** "06" for low-fire (negative) cones, "6" otherwise — how potters write them. */
export function coneName(cone: number): string {
  return cone < 0 ? `0${Math.abs(cone)}` : String(cone);
}

export function coneCelsius(cone: number | null | undefined): number | null {
  return cone === null || cone === undefined ? null : (CONE_CELSIUS[cone] ?? null);
}
