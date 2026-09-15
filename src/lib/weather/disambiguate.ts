import type { Location } from './schemas';

/**
 * A geocode result is ambiguous when the top matches share a name across
 * *different* countries ("Springfield, US" vs. "Springfield, UK") — not when
 * a country simply has more than one place by that name, which Open-Meteo's
 * own relevance ranking already resolves by picking the best match first.
 */
export function hasAmbiguousMatch(candidates: readonly Location[]): boolean {
  if (candidates.length < 2) return false;
  return new Set(candidates.map((candidate) => candidate.country)).size > 1;
}
