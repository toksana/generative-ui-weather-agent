import { getRedis } from './cache/redis';

const DEFAULT_DAILY_LIMIT = 20;
const SECONDS_PER_DAY = 24 * 60 * 60;

function dailyLimit(): number {
  const raw = process.env.DAILY_BUDGET_LIMIT;
  const parsed = raw ? Number(raw) : DEFAULT_DAILY_LIMIT;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

function utcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// In-memory fallback for local dev: a single global counter reset when the
// UTC date rolls over.
let memoryDay = '';
let memoryCount = 0;

function checkMemoryBudget(limit: number): boolean {
  const day = utcDateKey();
  if (day !== memoryDay) {
    memoryDay = day;
    memoryCount = 0;
  }
  memoryCount += 1;
  return memoryCount <= limit;
}

/** A global (not per-user) daily request budget, shared across all visitors. */
export async function checkBudget(): Promise<boolean> {
  const limit = dailyLimit();
  const redis = getRedis();
  if (!redis) return checkMemoryBudget(limit);

  const key = `wx:v1:budget:${utcDateKey()}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, SECONDS_PER_DAY + 3600);
  }
  return count <= limit;
}
