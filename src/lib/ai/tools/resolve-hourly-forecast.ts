import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import { hasAmbiguousMatch } from '@/lib/weather/disambiguate';
import type { HourlyForecast, HourlyMetric, ToolStream } from '@/lib/weather/schemas';
import { trimHourly } from '@/lib/weather/trim-hourly';

export interface HourlyForecastData {
  metric: HourlyMetric;
  hourly: HourlyForecast;
}

/** Resolves one city to an hourly forecast trimmed to the requested window. */
export async function* resolveHourlyForecast(
  city: string,
  metric: HourlyMetric,
  hours: number,
): AsyncGenerator<ToolStream<HourlyForecastData>> {
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

  yield {
    status: 'ready',
    location,
    data: { metric, hourly: trimHourly(forecast.data.hourly, hours) },
  };
}
