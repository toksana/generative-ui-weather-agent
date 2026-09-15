import { tool } from 'ai';

import { showHourlyForecastInputSchema } from '@/lib/weather/schemas';

import { resolveHourlyForecast } from './resolve-hourly-forecast';

export const showHourlyForecast = tool({
  description:
    'Show an hourly forecast (temperature or precipitation) for a single named city over the next N hours (default 24, max 48). Use this for "will it rain" or hour-by-hour questions.',
  inputSchema: showHourlyForecastInputSchema,
  execute: ({ city, metric, hours }) => resolveHourlyForecast(city, metric, hours),
});
