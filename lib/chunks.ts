/**
 * Splits id lists so `.in(...)` filters stay well under URL length limits
 * (PostgREST filters travel in the query string; ~500 uuids is already too long).
 */
export function chunks<T>(list: readonly T[], size = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
