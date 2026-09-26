import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cache/redis', () => ({ getRedis: vi.fn() }));

describe('checkRateLimit', () => {
  const originalMax = process.env.RATE_LIMIT_MAX;
  const originalWindowMs = process.env.RATE_LIMIT_WINDOW_MS;

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@upstash/ratelimit');
    process.env.RATE_LIMIT_MAX = originalMax;
    process.env.RATE_LIMIT_WINDOW_MS = originalWindowMs;
  });

  it('allows up to 5 requests per key via the in-memory fallback', async () => {
    // Arrange
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkRateLimit } = await import('./ratelimit');

    // Act
    const results: boolean[] = [];
    for (let i = 0; i < 5; i += 1) {
      results.push(await checkRateLimit('same-key'));
    }

    // Assert
    expect(results).toEqual([true, true, true, true, true]);
  });

  it('rejects the 6th request from the same key within the window', async () => {
    // Arrange
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkRateLimit } = await import('./ratelimit');
    for (let i = 0; i < 5; i += 1) {
      await checkRateLimit('same-key');
    }

    // Act
    const sixthResult = await checkRateLimit('same-key');

    // Assert
    expect(sixthResult).toBe(false);
  });

  it('tracks separate keys independently', async () => {
    // Arrange
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkRateLimit } = await import('./ratelimit');
    for (let i = 0; i < 5; i += 1) {
      await checkRateLimit('key-a');
    }

    // Act
    const otherKeyResult = await checkRateLimit('key-b');

    // Assert
    expect(otherKeyResult).toBe(true);
  });

  it('honors RATE_LIMIT_MAX to raise or lower the in-memory cap', async () => {
    // Arrange
    process.env.RATE_LIMIT_MAX = '2';
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkRateLimit } = await import('./ratelimit');

    // Act
    const results = [await checkRateLimit('capped-key'), await checkRateLimit('capped-key'), await checkRateLimit('capped-key')];

    // Assert
    expect(results).toEqual([true, true, false]);
  });

  it('honors RATE_LIMIT_WINDOW_MS so hits outside a shortened window are forgotten', async () => {
    // Arrange
    process.env.RATE_LIMIT_MAX = '1';
    process.env.RATE_LIMIT_WINDOW_MS = '10';
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue(null);
    const { checkRateLimit } = await import('./ratelimit');
    await checkRateLimit('short-window-key');

    // Act
    await new Promise((resolve) => setTimeout(resolve, 20));
    const result = await checkRateLimit('short-window-key');

    // Assert
    expect(result).toBe(true);
  });

  it('delegates to the Upstash Ratelimit client when Redis is configured', async () => {
    // Arrange
    const limit = vi.fn().mockResolvedValue({ success: true });
    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: Object.assign(
        vi.fn(function RatelimitMock() {
          return { limit };
        }),
        { slidingWindow: vi.fn() },
      ),
    }));
    const { getRedis } = await import('./cache/redis');
    vi.mocked(getRedis).mockReturnValue({} as never);
    const { checkRateLimit } = await import('./ratelimit');

    // Act
    const result = await checkRateLimit('hashed-key');

    // Assert
    expect(result).toBe(true);
    expect(limit).toHaveBeenCalledWith('hashed-key');
  });
});
