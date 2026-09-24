import { markFrame } from '@/lib/telemetry';
import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import { buildInsight } from '@/lib/weather/insight';
import { currentWeatherStreamSchema, safeToolStreamYield } from '@/lib/weather/schemas';
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
  const safe = (value: ToolStream<CurrentWeatherData>) =>
    safeToolStreamYield(currentWeatherStreamSchema, value, city);

  yield safe({ status: 'resolving', query: city });

  const geocoded = await geocodeCity(city);
  if (!geocoded.ok) {
    yield safe({ status: 'failed', query: city, reason: geocoded.reason });
    return;
  }

  const [location] = geocoded.data;
  markFrame('first_frame');
  yield safe({ status: 'located', location });

  const forecast = await fetchForecast(location);
  if (!forecast.ok) {
    yield safe({ status: 'failed', query: city, reason: forecast.reason });
    return;
  }

  const { current, hourly } = forecast.data;
  yield safe({
    status: 'ready',
    location,
    data: { conditions: current, hourly, insight: buildInsight({ conditions: current, hourly }) },
  });
}
