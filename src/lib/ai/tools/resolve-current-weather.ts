import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import { hasAmbiguousMatch } from '@/lib/weather/disambiguate';
import { buildInsight } from '@/lib/weather/insight';
import type { CurrentConditions, HourlyForecast, ToolStream } from '@/lib/weather/schemas';

export interface CurrentWeatherData {
  conditions: CurrentConditions;
  hourly: HourlyForecast;
  insight: string;
}

/**
 * Resolves one city to current conditions, yielding every intermediate
 * state. Shared by `showCurrentWeather` (which streams it directly) and
 * `compareCities` (which drains it per city and keeps only the last state).
 */
export async function* resolveCurrentWeather(
  city: string,
): AsyncGenerator<ToolStream<CurrentWeatherData>> {
  yield { status: 'resolving', query: city };

  const geocoded = await geocodeCity(city);
  if (!geocoded.ok) {
    yield { status: 'failed', query: city, reason: geocoded.reason };
    return;
  }

  if (hasAmbiguousMatch(geocoded.data)) {
    yield { status: 'ambiguous', query: city, candidates: geocoded.data };
    return;
  }

  const [location] = geocoded.data;
  yield { status: 'located', location };

  const forecast = await fetchForecast(location);
  if (!forecast.ok) {
    yield { status: 'failed', query: city, reason: forecast.reason };
    return;
  }

  const { current, hourly } = forecast.data;
  yield {
    status: 'ready',
    location,
    data: { conditions: current, hourly, insight: buildInsight({ conditions: current, hourly }) },
  };
}
