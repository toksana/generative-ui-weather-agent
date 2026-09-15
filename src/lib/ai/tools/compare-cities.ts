import { tool } from 'ai';

import { mergeAsResolved } from '@/lib/weather/merge-as-resolved';
import { compareCitiesInputSchema } from '@/lib/weather/schemas';
import type { ToolStream } from '@/lib/weather/schemas';

import type { CurrentWeatherData } from './resolve-current-weather';
import { resolveCurrentWeather } from './resolve-current-weather';

export interface ComparedCityUpdate {
  city: string;
  result: ToolStream<CurrentWeatherData>;
}

async function resolveFinalCityWeather(city: string): Promise<ToolStream<CurrentWeatherData>> {
  let last: ToolStream<CurrentWeatherData> = { status: 'resolving', query: city };
  for await (const state of resolveCurrentWeather(city)) {
    last = state;
  }
  return last;
}

/**
 * Resolves every city in parallel and yields each as it settles — via
 * `mergeAsResolved`, not `Promise.all` — so a 4-city comparison paints its
 * first card without waiting on the slowest fetch.
 */
export async function* resolveComparedCities(
  cities: readonly string[],
): AsyncGenerator<ComparedCityUpdate> {
  const tasks = cities.map((city) =>
    resolveFinalCityWeather(city).then((result): ComparedCityUpdate => ({ city, result })),
  );

  for await (const settled of mergeAsResolved(tasks)) {
    if (settled.status === 'fulfilled') yield settled.value;
  }
}

export const compareCities = tool({
  description:
    'Compare current weather across 2-4 named cities, rendering each city as its data resolves. Use this when the user names multiple cities to compare.',
  inputSchema: compareCitiesInputSchema,
  execute: ({ cities }) => resolveComparedCities(cities),
});
