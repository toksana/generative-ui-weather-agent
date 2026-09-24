import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cache/redis', () => ({ getRedis: vi.fn() }));

describe('checkBudget', () => {
  const originalLimit = process.env.DAILY_BUDGET_LIMIT;

  beforeEach(() => {
    vi.resetModules();
    process.env.DAILY_BUDGET_LIMIT = '2';
  });

  afterEach(() => {
    process.env.DAILY_BUDGET_LIMIT = originalLimit;
  });

  it('allows requests up to the daily limit via the in-memory fallback', async () => {
    // Arrange
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkBudget } = await import('./budget');

    // Act
    const results = [await checkBudget(), await checkBudget()];

    // Assert
    expect(results).toEqual([true, true]);
  });

  it('rejects once the in-memory fallback exceeds the daily limit', async () => {
    // Arrange
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkBudget } = await import('./budget');
    await checkBudget();
    await checkBudget();

    // Act
    const thirdResult = await checkBudget();

    // Assert
    expect(thirdResult).toBe(false);
  });

  it('increments a Redis counter and sets an expiry on the first hit of the day', async () => {
    // Arrange
    const incr = vi.fn().mockResolvedValue(1);
    const expire = vi.fn().mockResolvedValue(1);
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue({ incr, expire } as never);
    const { checkBudget } = await import('./budget');

    // Act
    const result = await checkBudget();

    // Assert
    expect(result).toBe(true);
    expect(incr).toHaveBeenCalledOnce();
    expect(expire).toHaveBeenCalledOnce();
  });

  it('rejects once the Redis counter exceeds the daily limit, without resetting the expiry', async () => {
    // Arrange
    const incr = vi.fn().mockResolvedValue(3);
    const expire = vi.fn();
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue({ incr, expire } as never);
    const { checkBudget } = await import('./budget');

    // Act
    const result = await checkBudget();

    // Assert
    expect(result).toBe(false);
    expect(expire).not.toHaveBeenCalled();
  });
});
