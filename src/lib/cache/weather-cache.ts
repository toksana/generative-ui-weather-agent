import { getRedis } from './redis';

// In-memory fallback for local dev: per-process cache keyed the same way the
// Upstash path would be, so caching (and its hit/miss telemetry) works
// without Upstash configured — same convention as ratelimit.ts/budget.ts.
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setMemoryCache<T>(key: string, value: T, ttlSeconds: number): void {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return getMemoryCache<T>(key);
  return (await redis.get<T>(key)) ?? null;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    setMemoryCache(key, value, ttlSeconds);
    return;
  }
  await redis.set(key, value, { ex: ttlSeconds });
}

const GEO_TTL_SECONDS = 60 * 60 * 24 * 30;
const FORECAST_TTL_SECONDS = 60 * 30;

function slugify(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, '-');
}

/** `wx:v1:geo:{slug}` — city name -> geocoding results, effectively static. */
export function geoCacheKey(query: string): string {
  return `wx:v1:geo:${slugify(query)}`;
}

/**
 * `wx:v1:fc:{lat},{lon}:{variant}` — coordinates -> forecast response.
 * `variant` is a literal today (there's only one forecast query shape), kept
 * so a future different query (e.g. a different metric set) can share the
 * key scheme without migrating existing keys.
 */
export function forecastCacheKey(latitude: number, longitude: number, variant = 'core'): string {
  return `wx:v1:fc:${latitude.toFixed(4)},${longitude.toFixed(4)}:${variant}`;
}

export const CACHE_TTL_SECONDS = {
  geo: GEO_TTL_SECONDS,
  forecast: FORECAST_TTL_SECONDS,
} as const;
