/**
 * Yields each task's settled outcome as soon as it settles, in completion
 * order rather than input order. Used to stream `compareCities` results
 * per-city as each fetch resolves, instead of blocking on `Promise.all`.
 *
 * Mirrors `PromiseSettledResult` so a slow or rejected task never aborts the
 * others — the caller decides what a rejection means for its own domain.
 */
export async function* mergeAsResolved<T>(
  tasks: readonly Promise<T>[],
): AsyncGenerator<PromiseSettledResult<T>, void, void> {
  const pending = new Map(
    tasks.map((task, index) => [
      index,
      task.then(
        (value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }),
        (reason): PromiseSettledResult<T> => ({ status: 'rejected', reason }),
      ),
    ]),
  );

  while (pending.size > 0) {
    const { index, result } = await Promise.race(
      Array.from(pending, async ([index, settlement]) => ({ index, result: await settlement })),
    );
    pending.delete(index);
    yield result;
  }
}
