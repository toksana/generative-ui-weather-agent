import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../cache/weather-cache', () => ({
  getCached: vi.fn(),
  setCached: vi.fn(),
  geoCacheKey: (query: string) => `wx:v1:geo:${query.trim().toLowerCase()}`,
  forecastCacheKey: (latitude: number, longitude: number) =>
    `wx:v1:fc:${latitude.toFixed(4)},${longitude.toFixed(4)}:core`,
  CACHE_TTL_SECONDS: { geo: 2_592_000, forecast: 1_800 },
}));

import { getCached, setCached } from '../cache/weather-cache';
import { fetchForecast, geocodeCity } from './client';

function jsonResponse(data: unknown, init: { ok?: boolean } = {}): Response {
  return {
    ok: init.ok ?? true,
    json: async () => data,
  } as Response;
}

function rawLocation(overrides: Record<string, unknown> = {}) {
  return {
    name: faker.location.city(),
    country: faker.location.country(),
    country_code: faker.location.countryCode(),
    admin1: faker.location.state(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    timezone: 'Europe/London',
    ...overrides,
  };
}

function rawCurrent(overrides: Record<string, unknown> = {}) {
  return {
    temperature_2m: 18.4,
    apparent_temperature: 17.1,
    relative_humidity_2m: 55,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 12.3,
    is_day: 1,
    ...overrides,
  };
}

function rawHourly(overrides: Record<string, unknown> = {}) {
  return {
    time: ['2026-09-14T12:00', '2026-09-14T13:00'],
    temperature_2m: [18.4, 19.1],
    precipitation_probability: [10, 20],
    precipitation: [0, 0.2],
    ...overrides,
  };
}

const timeoutError = new DOMException('The operation was aborted.', 'TimeoutError');

describe('geocodeCity', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(getCached).mockResolvedValue(null);
    vi.mocked(setCached).mockResolvedValue(undefined);
  });

  it('returns the matching location for a resolvable city', async () => {
    // Arrange
    const location = rawLocation();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [location] }));

    // Act
    const result = await geocodeCity('Paris');

    // Assert
    expect(result).toEqual({
      ok: true,
      data: [
        {
          name: location.name,
          country: location.country,
          countryCode: location.country_code,
          admin1: location.admin1,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
        },
      ],
    });
  });

  it('returns every candidate when a name is ambiguous across countries', async () => {
    // Arrange
    const springfieldUS = rawLocation({ name: 'Springfield', country: 'United States' });
    const springfieldUK = rawLocation({ name: 'Springfield', country: 'United Kingdom' });
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [springfieldUS, springfieldUK] }));

    // Act
    const result = await geocodeCity('Springfield');

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.data.map((location) => location.country)).toEqual([
      'United States',
      'United Kingdom',
    ]);
  });

  it('reports not_found when the geocoder has no matches', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));

    // Act
    const result = await geocodeCity('Nowhereville');

    // Assert
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('reports upstream_error when the geocoder responds with a non-ok status', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, { ok: false }));

    // Act
    const result = await geocodeCity('Paris');

    // Assert
    expect(result).toEqual({ ok: false, reason: 'upstream_error' });
  });

  it('reports invalid_response for a malformed body', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [{ name: 'Paris' }] }));

    // Act
    const result = await geocodeCity('Paris');

    // Assert
    expect(result).toEqual({ ok: false, reason: 'invalid_response' });
  });

  it('reports timeout when the request is aborted', async () => {
    // Arrange
    vi.mocked(fetch).mockRejectedValue(timeoutError);

    // Act
    const result = await geocodeCity('Paris');

    // Assert
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('returns the cached locations without calling fetch on a cache hit', async () => {
    // Arrange
    const cachedLocations = [
      {
        name: 'Paris',
        country: 'France',
        countryCode: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
        timezone: 'Europe/Paris',
      },
    ];
    vi.mocked(getCached).mockResolvedValue(cachedLocations);

    // Act
    const result = await geocodeCity('Paris');

    // Assert
    expect(result).toEqual({ ok: true, data: cachedLocations });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('caches a successful geocoding result on a cache miss', async () => {
    // Arrange
    const location = rawLocation();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [location] }));

    // Act
    const result = await geocodeCity('Paris');

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(setCached).toHaveBeenCalledWith('wx:v1:geo:paris', result.data, 2_592_000);
  });
});

describe('fetchForecast', () => {
  const validLocation = { latitude: 48.8566, longitude: 2.3522 };

  beforeEach(() => {
    vi.mocked(getCached).mockResolvedValue(null);
    vi.mocked(setCached).mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns current conditions and hourly forecast for valid coordinates', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ current: rawCurrent(), hourly: rawHourly() }),
    );

    // Act
    const result = await fetchForecast(validLocation);

    // Assert
    expect(result).toEqual({
      ok: true,
      data: {
        current: {
          temperature: 18.4,
          apparentTemperature: 17.1,
          relativeHumidity: 55,
          precipitation: 0,
          weatherCode: 2,
          windSpeed: 12.3,
          isDay: true,
        },
        hourly: {
          time: ['2026-09-14T12:00', '2026-09-14T13:00'],
          temperature: [18.4, 19.1],
          precipitationProbability: [10, 20],
          precipitation: [0, 0.2],
        },
      },
    });
  });

  it('reports invalid_response for a malformed body', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ current: rawCurrent(), hourly: { time: ['2026-09-14T12:00'] } }),
    );

    // Act
    const result = await fetchForecast(validLocation);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'invalid_response' });
  });

  it('reports upstream_error when the forecast API responds with a non-ok status', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, { ok: false }));

    // Act
    const result = await fetchForecast(validLocation);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'upstream_error' });
  });

  it('reports timeout when the request is aborted', async () => {
    // Arrange
    vi.mocked(fetch).mockRejectedValue(timeoutError);

    // Act
    const result = await fetchForecast(validLocation);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('returns the cached forecast without calling fetch on a cache hit', async () => {
    // Arrange
    const cachedForecast = {
      current: {
        temperature: 18.4,
        apparentTemperature: 17.1,
        relativeHumidity: 55,
        precipitation: 0,
        weatherCode: 2,
        windSpeed: 12.3,
        isDay: true,
      },
      hourly: {
        time: ['2026-09-14T12:00'],
        temperature: [18.4],
        precipitationProbability: [10],
        precipitation: [0],
      },
    };
    vi.mocked(getCached).mockResolvedValue(cachedForecast);

    // Act
    const result = await fetchForecast(validLocation);

    // Assert
    expect(result).toEqual({ ok: true, data: cachedForecast });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('caches a successful forecast result on a cache miss', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ current: rawCurrent(), hourly: rawHourly() }),
    );

    // Act
    const result = await fetchForecast(validLocation);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(setCached).toHaveBeenCalledWith('wx:v1:fc:48.8566,2.3522:core', result.data, 1_800);
  });

  it('honours OPEN_METEO_BASE_URL so the host can be redirected for a fallback drill', async () => {
    // Arrange
    vi.stubEnv('OPEN_METEO_BASE_URL', 'https://dead-host.example');
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ current: rawCurrent(), hourly: rawHourly() }),
    );

    // Act
    await fetchForecast(validLocation);

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://dead-host.example'),
      expect.anything(),
    );
  });
});
