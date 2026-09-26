import type { Duration } from '@upstash/ratelimit';
import { Ratelimit } from '@upstash/ratelimit';

import { DEFAULT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_WINDOW_MS } from '@/config/constants';

import { getRedis } from './cache/redis';

function rateLimitMax(): number {
  const raw = process.env.RATE_LIMIT_MAX;
  const parsed = raw ? Number(raw) : DEFAULT_RATE_LIMIT_MAX;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RATE_LIMIT_MAX;
}

function rateLimitWindowMs(): number {
  const raw = process.env.RATE_LIMIT_WINDOW_MS;
  const parsed = raw ? Number(raw) : DEFAULT_RATE_LIMIT_WINDOW_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RATE_LIMIT_WINDOW_MS;
}

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;

  const redis = getRedis();
  ratelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rateLimitMax(), `${rateLimitWindowMs()} ms` as Duration),
        prefix: 'wx:v1:ratelimit',
      })
    : null;
  return ratelimit;
}

// In-memory fallback for local dev: per-process sliding window keyed by the
// same hashed identifier the Upstash path would use.
const memoryHits = new Map<string, number[]>();

function checkMemoryLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = rateLimitWindowMs();
  const limit = rateLimitMax();
  const hits = (memoryHits.get(key) ?? []).filter((hit) => now - hit < windowMs);

  if (hits.length >= limit) {
    memoryHits.set(key, hits);
    return false;
  }

  hits.push(now);
  memoryHits.set(key, hits);
  return true;
}

/** `key` should already be a hashed, non-reversible identifier (see `hashIdentifier`). */
export async function checkRateLimit(key: string): Promise<boolean> {
  const rl = getRatelimit();
  if (!rl) return checkMemoryLimit(key);

  const { success } = await rl.limit(key);
  return success;
}
