import { markFrame } from '@/lib/telemetry';
import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import { hourlyForecastStreamSchema, safeToolStreamYield } from '@/lib/weather/schemas';
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
  const safe = (value: ToolStream<HourlyForecastData>) =>
    safeToolStreamYield(hourlyForecastStreamSchema, value, city);

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

  yield safe({
    status: 'ready',
    location,
    data: { metric, hourly: trimHourly(forecast.data.hourly, hours) },
  });
}
