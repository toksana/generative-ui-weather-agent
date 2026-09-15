import { z } from 'zod';

import type { FailureReason } from '../types';

/**
 * A resolved place, as returned by the Open-Meteo geocoding API.
 * https://open-meteo.com/en/docs/geocoding-api
 */
export const locationSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  countryCode: z.string().length(2).optional(),
  admin1: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
});

export type Location = z.infer<typeof locationSchema>;

/**
 * A `current` weather block from the Open-Meteo forecast API, after mapping
 * the API's snake_case field names to camelCase.
 */
export const currentConditionsSchema = z.object({
  temperature: z.number(),
  apparentTemperature: z.number(),
  relativeHumidity: z.number().min(0).max(100),
  precipitation: z.number().min(0),
  weatherCode: z.number().int(),
  windSpeed: z.number().min(0),
  isDay: z.boolean(),
});

export type CurrentConditions = z.infer<typeof currentConditionsSchema>;

/**
 * An `hourly` weather block. Open-Meteo returns parallel arrays keyed by
 * position against `time` — every array must be the same length so a widget
 * can safely zip them by index.
 */
export const hourlyForecastSchema = z
  .object({
    time: z.array(z.string().min(1)).min(1),
    temperature: z.array(z.number()),
    precipitationProbability: z.array(z.number().min(0).max(100)),
    precipitation: z.array(z.number().min(0)),
  })
  .refine(
    (forecast) =>
      forecast.temperature.length === forecast.time.length &&
      forecast.precipitationProbability.length === forecast.time.length &&
      forecast.precipitation.length === forecast.time.length,
    { message: 'All hourly series must share the same length as `time`' },
  );

export type HourlyForecast = z.infer<typeof hourlyForecastSchema>;

const cityInput = z
  .string()
  .trim()
  .min(1, 'A city name is required')
  .max(100, 'City name is too long');

export const showCurrentWeatherInputSchema = z.object({
  city: cityInput,
});

export type ShowCurrentWeatherInput = z.infer<typeof showCurrentWeatherInputSchema>;

export const compareCitiesInputSchema = z.object({
  cities: z
    .array(cityInput)
    .min(2, 'Comparing needs at least 2 cities')
    .max(4, 'Comparing more than 4 cities stops being legible'),
});

export type CompareCitiesInput = z.infer<typeof compareCitiesInputSchema>;

export const hourlyMetricSchema = z.enum(['temperature', 'precipitation']);
export type HourlyMetric = z.infer<typeof hourlyMetricSchema>;

export const showHourlyForecastInputSchema = z.object({
  city: cityInput,
  metric: hourlyMetricSchema,
  hours: z.number().int().min(1).max(48).default(24),
});

export type ShowHourlyForecastInput = z.infer<typeof showHourlyForecastInputSchema>;

const nearestActionSchema = z.object({
  label: z.string().trim().min(1).max(60),
  prompt: z.string().trim().min(1).max(200),
});

export const explainCapabilityInputSchema = z.object({
  requested: z.string().trim().min(1).max(200),
  nearest: z.array(nearestActionSchema).min(1).max(3),
});

export type ExplainCapabilityInput = z.infer<typeof explainCapabilityInputSchema>;

/**
 * The one stream contract every weather tool's `execute` yields against.
 * Every state — including the terminal ones — must be `yield`ed rather than
 * `return`ed: `@ai-sdk/provider-utils`'s `executeTool` drains a tool's
 * AsyncIterable with a plain `for await...of` loop and republishes only the
 * last *yielded* value as the tool's final output, so a bare `return` value
 * is silently discarded and never reaches the client.
 */
export type ToolStream<T> =
  | { status: 'resolving'; query: string }
  | { status: 'ambiguous'; query: string; candidates: Location[] }
  | { status: 'located'; location: Location }
  | { status: 'ready'; location: Location; data: T }
  | { status: 'failed'; query: string; reason: FailureReason };
