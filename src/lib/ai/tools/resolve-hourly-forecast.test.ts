import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import type { CurrentConditions, HourlyForecast, Location } from '@/lib/weather/schemas';

import { resolveHourlyForecast } from './resolve-hourly-forecast';

vi.mock('@/lib/weather/client', () => ({
  geocodeCity: vi.fn(),
  fetchForecast: vi.fn(),
}));

const london: Location = {
  name: 'London',
  country: 'United Kingdom',
  latitude: 51.5072,
  longitude: -0.1276,
  timezone: 'Europe/London',
};

const conditions: CurrentConditions = {
  temperature: 14.2,
  apparentTemperature: 13.5,
  relativeHumidity: 70,
  precipitation: 0.1,
  weatherCode: 61,
  windSpeed: 9.4,
  isDay: true,
};

const hourly: HourlyForecast = {
  time: Array.from({ length: 4 }, (_, index) => `2026-09-14T${String(index).padStart(2, '0')}:00`),
  temperature: [12, 13, 14, 15],
  precipitationProbability: [10, 20, 60, 70],
  precipitation: [0, 0, 0.4, 0.6],
};

async function drain<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

describe('resolveHourlyForecast', () => {
  beforeEach(() => {
    vi.mocked(geocodeCity).mockReset();
    vi.mocked(fetchForecast).mockReset();
  });

  it('yields resolving, located, then ready with the forecast trimmed to the requested hours', async () => {
    // Arrange
    vi.mocked(geocodeCity).mockResolvedValue({ ok: true, data: [london] });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: true, data: { current: conditions, hourly } });

    // Act
    const states = await drain(resolveHourlyForecast('London', 'precipitation', 2));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'London' },
      { status: 'located', location: london },
      {
        status: 'ready',
        location: london,
        data: {
          metric: 'precipitation',
          hourly: {
            time: hourly.time.slice(0, 2),
            temperature: [12, 13],
            precipitationProbability: [10, 20],
            precipitation: [0, 0],
          },
        },
      },
    ]);
  });

  it('auto-resolves to the top candidate when the name matches across countries', async () => {
    // Arrange
    const cambridgeUS: Location = { ...london, name: 'Cambridge', country: 'United States' };
    const cambridgeUK: Location = { ...london, name: 'Cambridge', country: 'United Kingdom' };
    vi.mocked(geocodeCity).mockResolvedValue({ ok: true, data: [cambridgeUS, cambridgeUK] });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: true, data: { current: conditions, hourly } });

    // Act
    const states = await drain(resolveHourlyForecast('Cambridge', 'temperature', 24));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'Cambridge' },
      { status: 'located', location: cambridgeUS },
      {
        status: 'ready',
        location: cambridgeUS,
        data: { metric: 'temperature', hourly },
      },
    ]);
    expect(fetchForecast).toHaveBeenCalledWith(cambridgeUS);
  });

  it('ends on failed when geocoding fails', async () => {
    // Arrange
    vi.mocked(geocodeCity).mockResolvedValue({ ok: false, reason: 'not_found' });

    // Act
    const states = await drain(resolveHourlyForecast('Nowhereville', 'temperature', 24));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'Nowhereville' },
      { status: 'failed', query: 'Nowhereville', reason: 'not_found' },
    ]);
  });

  it('ends on failed when the forecast fetch fails after locating', async () => {
    // Arrange
    vi.mocked(geocodeCity).mockResolvedValue({ ok: true, data: [london] });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: false, reason: 'timeout' });

    // Act
    const states = await drain(resolveHourlyForecast('London', 'temperature', 24));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'London' },
      { status: 'located', location: london },
      { status: 'failed', query: 'London', reason: 'timeout' },
    ]);
  });
});
