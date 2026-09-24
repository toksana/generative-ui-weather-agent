import { Redis } from '@upstash/redis';

let cachedRedis: Redis | null | undefined;

/**
 * The real Upstash client when `UPSTASH_REDIS_REST_URL`/`_TOKEN` are set, or
 * `null` so callers (ratelimit.ts, budget.ts) fall back to an in-memory
 * implementation — local dev needs only `ANTHROPIC_API_KEY`.
 */
export function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  cachedRedis = url && token ? new Redis({ url, token }) : null;
  return cachedRedis;
}
