import { z } from 'zod';

import { DEFAULT_OPEN_METEO_BASE_URL, DEFAULT_OPEN_METEO_GEOCODING_BASE_URL } from '@/config/constants';

import { CACHE_TTL_SECONDS, forecastCacheKey, geoCacheKey, getCached, setCached } from '../cache/weather-cache';
import { recordCacheResult } from '../telemetry';
import type { Result } from '../types';
import {
  currentConditionsSchema,
  hourlyForecastSchema,
  locationSchema,
  type CurrentConditions,
  type HourlyForecast,
  type Location,
} from './schemas';

const REQUEST_TIMEOUT_MS = 5000;
const GEOCODING_RESULT_COUNT = 5;

// City name -> coordinates is effectively static; cache it for a day.
const GEOCODING_REVALIDATE_SECONDS = 60 * 60 * 24;
// Matches Open-Meteo's own update cadence for current conditions/hourly data.
const FORECAST_REVALIDATE_SECONDS = 60 * 5;

function geocodingBaseUrl(): string {
  return process.env.OPEN_METEO_GEOCODING_BASE_URL ?? DEFAULT_OPEN_METEO_GEOCODING_BASE_URL;
}

function forecastBaseUrl(): string {
  return process.env.OPEN_METEO_BASE_URL ?? DEFAULT_OPEN_METEO_BASE_URL;
}

// Raw Open-Meteo geocoding response shape — snake_case, mapped to `Location`
// (camelCase, the app's contract) once it's structurally validated.
const rawGeocodingResultSchema = z.object({
  name: z.string(),
  country: z.string(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
});

const rawGeocodingResponseSchema = z.object({
  results: z.array(rawGeocodingResultSchema).optional(),
});

// Raw Open-Meteo forecast response shape — see the `current`/`hourly` query
// params below for which fields are requested.
const rawCurrentSchema = z.object({
  temperature_2m: z.number(),
  apparent_temperature: z.number(),
  relative_humidity_2m: z.number(),
  precipitation: z.number(),
  weather_code: z.number(),
  wind_speed_10m: z.number(),
  is_day: z.union([z.literal(0), z.literal(1)]),
});

const rawHourlySchema = z.object({
  time: z.array(z.string()),
  temperature_2m: z.array(z.number()),
  precipitation_probability: z.array(z.number()),
  precipitation: z.array(z.number()),
});

const rawForecastResponseSchema = z.object({
  current: rawCurrentSchema,
  hourly: rawHourlySchema,
});

function toLocation(raw: z.infer<typeof rawGeocodingResultSchema>): Location {
  return {
    name: raw.name,
    country: raw.country,
    countryCode: raw.country_code,
    admin1: raw.admin1,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
  };
}

/**
 * Fetches and JSON-decodes a URL under a fixed timeout. Never throws: network
 * failures, non-2xx statuses, and unparsable bodies all become a `Result`.
 */
async function fetchJson(url: string, revalidateSeconds: number): Promise<Result<unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: revalidateSeconds },
    });
  } catch (error) {
    // Cross-realm `instanceof` can't be trusted here (jsdom's globals vs.
    // Node's), so duck-type the name instead of checking `instanceof Error`.
    const name = (error as { name?: unknown } | null)?.name;
    if (name === 'TimeoutError') {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'upstream_error' };
  }

  if (!response.ok) return { ok: false, reason: 'upstream_error' };

  try {
    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, reason: 'invalid_response' };
  }
}

/**
 * Resolves a free-text city name to candidate locations. Returns every match
 * Open-Meteo finds (up to {@link GEOCODING_RESULT_COUNT}) rather than picking
 * one — a name shared across countries ("Springfield") is a tool-layer
 * disambiguation concern, not a client-layer failure.
 */
export async function geocodeCity(query: string): Promise<Result<Location[]>> {
  const cacheKey = geoCacheKey(query);
  const cached = await getCached<Location[]>(cacheKey);
  recordCacheResult('geo', cached !== null);
  if (cached !== null) return { ok: true, data: cached };

  const url = new URL('/v1/search', geocodingBaseUrl());
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(GEOCODING_RESULT_COUNT));
  url.searchParams.set('language', 'en');

  const response = await fetchJson(url.toString(), GEOCODING_REVALIDATE_SECONDS);
  if (!response.ok) return response;

  const parsed = rawGeocodingResponseSchema.safeParse(response.data);
  if (!parsed.success) return { ok: false, reason: 'invalid_response' };

  const results = parsed.data.results ?? [];
  if (results.length === 0) return { ok: false, reason: 'not_found' };

  const validated = z.array(locationSchema).safeParse(results.map(toLocation));
  if (!validated.success) return { ok: false, reason: 'invalid_response' };

  await setCached(cacheKey, validated.data, CACHE_TTL_SECONDS.geo);
  return { ok: true, data: validated.data };
}

/**
 * Fetches current conditions plus a 2-day hourly forecast for a resolved
 * location.
 */
export async function fetchForecast(
  location: Pick<Location, 'latitude' | 'longitude'>,
): Promise<Result<{ current: CurrentConditions; hourly: HourlyForecast }>> {
  const cacheKey = forecastCacheKey(location.latitude, location.longitude);
  const cached = await getCached<{ current: CurrentConditions; hourly: HourlyForecast }>(cacheKey);
  recordCacheResult('forecast', cached !== null);
  if (cached !== null) return { ok: true, data: cached };

  const url = new URL('/v1/forecast', forecastBaseUrl());
  url.searchParams.set('latitude', String(location.latitude));
  url.searchParams.set('longitude', String(location.longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day',
  );
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,precipitation');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');

  const response = await fetchJson(url.toString(), FORECAST_REVALIDATE_SECONDS);
  if (!response.ok) return response;

  const parsed = rawForecastResponseSchema.safeParse(response.data);
  if (!parsed.success) return { ok: false, reason: 'invalid_response' };

  const validatedCurrent = currentConditionsSchema.safeParse({
    temperature: parsed.data.current.temperature_2m,
    apparentTemperature: parsed.data.current.apparent_temperature,
    relativeHumidity: parsed.data.current.relative_humidity_2m,
    precipitation: parsed.data.current.precipitation,
    weatherCode: parsed.data.current.weather_code,
    windSpeed: parsed.data.current.wind_speed_10m,
    isDay: parsed.data.current.is_day === 1,
  });
  const validatedHourly = hourlyForecastSchema.safeParse({
    time: parsed.data.hourly.time,
    temperature: parsed.data.hourly.temperature_2m,
    precipitationProbability: parsed.data.hourly.precipitation_probability,
    precipitation: parsed.data.hourly.precipitation,
  });

  if (!validatedCurrent.success || !validatedHourly.success) {
    return { ok: false, reason: 'invalid_response' };
  }

  const data = { current: validatedCurrent.data, hourly: validatedHourly.data };
  await setCached(cacheKey, data, CACHE_TTL_SECONDS.forecast);
  return { ok: true, data };
}
