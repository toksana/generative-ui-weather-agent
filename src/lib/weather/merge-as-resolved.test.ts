import { describe, expect, it } from 'vitest';

import { mergeAsResolved } from './merge-as-resolved';

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function delayedRejection(reason: unknown, ms: number): Promise<never> {
  return new Promise((_resolve, reject) => setTimeout(() => reject(reason), ms));
}

describe('mergeAsResolved', () => {
  it('yields values in completion order, not input order', async () => {
    // Arrange
    const tasks = [delay('slow', 30), delay('fast', 5), delay('medium', 15)];

    // Act
    const values: string[] = [];
    for await (const settled of mergeAsResolved(tasks)) {
      if (settled.status === 'fulfilled') values.push(settled.value);
    }

    // Assert
    expect(values).toEqual(['fast', 'medium', 'slow']);
  });

  it('surfaces a rejected task without aborting the others', async () => {
    // Arrange
    const failure = new Error('city lookup failed');
    const tasks = [delay('ok-1', 5), delayedRejection(failure, 10), delay('ok-2', 15)];

    // Act
    const results = [];
    for await (const settled of mergeAsResolved(tasks)) {
      results.push(settled);
    }

    // Assert
    expect(results).toEqual([
      { status: 'fulfilled', value: 'ok-1' },
      { status: 'rejected', reason: failure },
      { status: 'fulfilled', value: 'ok-2' },
    ]);
  });

  it('completes immediately for an empty task list', async () => {
    // Arrange
    const tasks: Promise<never>[] = [];

    // Act
    const results = [];
    for await (const settled of mergeAsResolved(tasks)) {
      results.push(settled);
    }

    // Assert
    expect(results).toEqual([]);
  });
});
