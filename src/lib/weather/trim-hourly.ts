import type { HourlyForecast } from './schemas';

/** Keeps only the first `hours` points of every parallel series. */
export function trimHourly(hourly: HourlyForecast, hours: number): HourlyForecast {
  return {
    time: hourly.time.slice(0, hours),
    temperature: hourly.temperature.slice(0, hours),
    precipitationProbability: hourly.precipitationProbability.slice(0, hours),
    precipitation: hourly.precipitation.slice(0, hours),
  };
}
