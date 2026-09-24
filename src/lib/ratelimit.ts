import { Ratelimit } from '@upstash/ratelimit';

import { getRedis } from './cache/redis';

const LIMIT = 5;
const WINDOW = '1 d';
const WINDOW_MS = 24 * 60 * 60 * 1000;

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;

  const redis = getRedis();
  ratelimit = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMIT, WINDOW), prefix: 'wx:v1:ratelimit' })
    : null;
  return ratelimit;
}

// In-memory fallback for local dev: per-process sliding window keyed by the
// same hashed identifier the Upstash path would use.
const memoryHits = new Map<string, number[]>();

function checkMemoryLimit(key: string): boolean {
  const now = Date.now();
  const hits = (memoryHits.get(key) ?? []).filter((hit) => now - hit < WINDOW_MS);

  if (hits.length >= LIMIT) {
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
