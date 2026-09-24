import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchForecast, geocodeCity } from '@/lib/weather/client';
import type { CurrentConditions, HourlyForecast, Location } from '@/lib/weather/schemas';

import { resolveCurrentWeather } from './resolve-current-weather';

vi.mock('@/lib/weather/client', () => ({
  geocodeCity: vi.fn(),
  fetchForecast: vi.fn(),
}));

const paris: Location = {
  name: 'Paris',
  country: 'France',
  latitude: 48.8566,
  longitude: 2.3522,
  timezone: 'Europe/Paris',
};

const conditions: CurrentConditions = {
  temperature: 18.4,
  apparentTemperature: 17.1,
  relativeHumidity: 55,
  precipitation: 0,
  weatherCode: 2,
  windSpeed: 12.3,
  isDay: true,
};

const hourly: HourlyForecast = {
  time: ['2026-09-14T12:00', '2026-09-14T13:00'],
  temperature: [18.4, 19.1],
  precipitationProbability: [10, 20],
  precipitation: [0, 0.2],
};

async function drain<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

describe('resolveCurrentWeather', () => {
  beforeEach(() => {
    vi.mocked(geocodeCity).mockReset();
    vi.mocked(fetchForecast).mockReset();
  });

  it('yields resolving, located, then ready for a clean single match', async () => {
    // Arrange
    vi.mocked(geocodeCity).mockResolvedValue({ ok: true, data: [paris] });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: true, data: { current: conditions, hourly } });

    // Act
    const states = await drain(resolveCurrentWeather('Paris'));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'Paris' },
      { status: 'located', location: paris },
      {
        status: 'ready',
        location: paris,
        data: { conditions, hourly, insight: expect.any(String) },
      },
    ]);
  });

  it('auto-resolves to the top candidate when the name matches across countries', async () => {
    // Arrange
    const springfieldUS: Location = { ...paris, name: 'Springfield', country: 'United States' };
    const springfieldUK: Location = { ...paris, name: 'Springfield', country: 'United Kingdom' };
    vi.mocked(geocodeCity).mockResolvedValue({ ok: true, data: [springfieldUS, springfieldUK] });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: true, data: { current: conditions, hourly } });

    // Act
    const states = await drain(resolveCurrentWeather('Springfield'));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'Springfield' },
      { status: 'located', location: springfieldUS },
      {
        status: 'ready',
        location: springfieldUS,
        data: { conditions, hourly, insight: expect.any(String) },
      },
    ]);
  });

  it('ends on failed when geocoding fails', async () => {
    // Arrange
    vi.mocked(geocodeCity).mockResolvedValue({ ok: false, reason: 'not_found' });

    // Act
    const states = await drain(resolveCurrentWeather('Nowhereville'));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'Nowhereville' },
      { status: 'failed', query: 'Nowhereville', reason: 'not_found' },
    ]);
  });

  it('ends on failed when the forecast fetch fails after locating', async () => {
    // Arrange
    vi.mocked(geocodeCity).mockResolvedValue({ ok: true, data: [paris] });
    vi.mocked(fetchForecast).mockResolvedValue({ ok: false, reason: 'timeout' });

    // Act
    const states = await drain(resolveCurrentWeather('Paris'));

    // Assert
    expect(states).toEqual([
      { status: 'resolving', query: 'Paris' },
      { status: 'located', location: paris },
      { status: 'failed', query: 'Paris', reason: 'timeout' },
    ]);
  });
});
