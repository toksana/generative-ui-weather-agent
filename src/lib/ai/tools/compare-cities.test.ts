import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import type { CurrentConditions, HourlyForecast, Location } from '@/lib/weather/schemas';

import { resolveComparedCities } from './compare-cities';

vi.mock('@/lib/weather/client', () => ({
  geocodeCity: vi.fn(),
  fetchForecast: vi.fn(),
}));

function makeLocation(name: string): Location {
  return {
    name,
    country: 'Testland',
    latitude: 1,
    longitude: 1,
    timezone: 'UTC',
  };
}

const conditions: CurrentConditions = {
  temperature: 20,
  apparentTemperature: 19,
  relativeHumidity: 50,
  precipitation: 0,
  weatherCode: 0,
  windSpeed: 5,
  isDay: true,
};

const hourly: HourlyForecast = {
  time: ['2026-09-14T12:00'],
  temperature: [20],
  precipitationProbability: [0],
  precipitation: [0],
};

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function drain<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

describe('resolveComparedCities', () => {
  beforeEach(() => {
    vi.mocked(geocodeCity).mockReset();
    vi.mocked(fetchForecast).mockReset();
  });

  it('yields each city once it settles, in settlement order rather than input order', async () => {
    // Arrange
    const tokyo = makeLocation('Tokyo');
    const oslo = makeLocation('Oslo');

    vi.mocked(geocodeCity).mockImplementation(async (city: string) => {
      if (city === 'Tokyo') {
        await delay(undefined, 20);
        return { ok: true, data: [tokyo] };
      }
      return { ok: true, data: [oslo] };
    });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: true, data: { current: conditions, hourly } });

    // Act
    const updates = await drain(resolveComparedCities(['Tokyo', 'Oslo']));

    // Assert
    expect(updates.map((update) => update.city)).toEqual(['Oslo', 'Tokyo']);
    expect(updates[0].result.status).toBe('ready');
    expect(updates[1].result.status).toBe('ready');
  });

  it('surfaces one failed city without blocking the others', async () => {
    // Arrange
    const tokyo = makeLocation('Tokyo');
    vi.mocked(geocodeCity).mockImplementation(async (city: string) => {
      if (city === 'Nowhereville') return { ok: false, reason: 'not_found' };
      return { ok: true, data: [tokyo] };
    });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: true, data: { current: conditions, hourly } });

    // Act
    const updates = await drain(resolveComparedCities(['Tokyo', 'Nowhereville']));

    // Assert
    const byCity = Object.fromEntries(updates.map((update) => [update.city, update.result]));
    expect(byCity.Tokyo).toEqual({
      status: 'ready',
      location: tokyo,
      data: { conditions, hourly, insight: expect.any(String) },
    });
    expect(byCity.Nowhereville).toEqual({
      status: 'failed',
      query: 'Nowhereville',
      reason: 'not_found',
    });
  });
});
