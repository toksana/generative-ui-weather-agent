import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import {
  compareCitiesInputSchema,
  currentConditionsSchema,
  explainCapabilityInputSchema,
  hourlyForecastSchema,
  locationSchema,
  showCurrentWeatherInputSchema,
  showHourlyForecastInputSchema,
} from './schemas';

function validLocation() {
  return {
    name: faker.location.city(),
    country: faker.location.country(),
    countryCode: faker.location.countryCode(),
    admin1: faker.location.state(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    timezone: 'Europe/London',
  };
}

function validCurrentConditions() {
  return {
    temperature: 18.4,
    apparentTemperature: 17.1,
    relativeHumidity: 55,
    precipitation: 0,
    weatherCode: 2,
    windSpeed: 12.3,
    isDay: true,
  };
}

function validHourlyForecast() {
  return {
    time: ['2026-09-14T12:00', '2026-09-14T13:00'],
    temperature: [18.4, 19.1],
    precipitationProbability: [10, 20],
    precipitation: [0, 0.2],
  };
}

describe('locationSchema', () => {
  it('accepts a well-formed Open-Meteo geocoding result', () => {
    // Arrange
    const location = validLocation();

    // Act
    const result = locationSchema.safeParse(location);

    // Assert
    expect(result.success).toBe(true);
  });

  it('accepts an admin1-less location, since not every place has one', () => {
    // Arrange
    const { admin1: _admin1, ...location } = validLocation();

    // Act
    const result = locationSchema.safeParse(location);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    ['latitude out of range', { latitude: 120 }],
    ['longitude out of range', { longitude: -200 }],
    ['missing name', { name: undefined }],
    ['missing timezone', { timezone: undefined }],
  ])('rejects a location with %s', (_label, override) => {
    // Arrange
    const location = { ...validLocation(), ...override };

    // Act
    const result = locationSchema.safeParse(location);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('currentConditionsSchema', () => {
  it('accepts a well-formed Open-Meteo `current` block', () => {
    // Arrange
    const conditions = validCurrentConditions();

    // Act
    const result = currentConditionsSchema.safeParse(conditions);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    ['a string temperature', { temperature: '18.4' }],
    ['a negative humidity', { relativeHumidity: -5 }],
    ['a humidity over 100', { relativeHumidity: 140 }],
    ['a non-boolean isDay', { isDay: 1 }],
  ])('rejects conditions with %s', (_label, override) => {
    // Arrange
    const conditions = { ...validCurrentConditions(), ...override };

    // Act
    const result = currentConditionsSchema.safeParse(conditions);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('hourlyForecastSchema', () => {
  it('accepts parallel arrays of equal length', () => {
    // Arrange
    const forecast = validHourlyForecast();

    // Act
    const result = hourlyForecastSchema.safeParse(forecast);

    // Assert
    expect(result.success).toBe(true);
  });

  it('rejects mismatched array lengths, since the widget zips them by index', () => {
    // Arrange
    const forecast = { ...validHourlyForecast(), temperature: [18.4] };

    // Act
    const result = hourlyForecastSchema.safeParse(forecast);

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects an empty time series', () => {
    // Arrange
    const forecast = {
      time: [],
      temperature: [],
      precipitationProbability: [],
      precipitation: [],
    };

    // Act
    const result = hourlyForecastSchema.safeParse(forecast);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('showCurrentWeatherInputSchema', () => {
  it('accepts a non-empty city string', () => {
    // Arrange / Act
    const result = showCurrentWeatherInputSchema.safeParse({ city: 'Tokyo' });

    // Assert
    expect(result.success).toBe(true);
  });

  it.each(['', '   ', 'x'.repeat(101)])('rejects the city string %p', (city) => {
    // Arrange / Act
    const result = showCurrentWeatherInputSchema.safeParse({ city });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('compareCitiesInputSchema', () => {
  it('accepts between 2 and 4 cities', () => {
    // Arrange / Act
    const result = compareCitiesInputSchema.safeParse({ cities: ['Tokyo', 'Osaka'] });

    // Assert
    expect(result.success).toBe(true);
  });

  it('rejects a single city, since that is showCurrentWeather territory', () => {
    // Arrange / Act
    const result = compareCitiesInputSchema.safeParse({ cities: ['Tokyo'] });

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 cities to keep the widget legible', () => {
    // Arrange / Act
    const result = compareCitiesInputSchema.safeParse({
      cities: ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Sapporo'],
    });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('showHourlyForecastInputSchema', () => {
  it('accepts a valid metric and hour count', () => {
    // Arrange / Act
    const result = showHourlyForecastInputSchema.safeParse({
      city: 'London',
      metric: 'precipitation',
      hours: 12,
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it('defaults hours to 24 when omitted', () => {
    // Arrange / Act
    const result = showHourlyForecastInputSchema.safeParse({
      city: 'London',
      metric: 'temperature',
    });

    // Assert
    expect(result.success && result.data.hours).toBe(24);
  });

  it('rejects a metric outside the supported set', () => {
    // Arrange / Act
    const result = showHourlyForecastInputSchema.safeParse({
      city: 'London',
      metric: 'wind',
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 49])('rejects an hour count of %i outside the 1-48 window', (hours) => {
    // Arrange / Act
    const result = showHourlyForecastInputSchema.safeParse({
      city: 'London',
      metric: 'temperature',
      hours,
    });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('explainCapabilityInputSchema', () => {
  it('accepts a requested topic with 1-3 nearest-action chips', () => {
    // Arrange / Act
    const result = explainCapabilityInputSchema.safeParse({
      requested: 'weather in Rome in 1990',
      nearest: [{ label: 'Current weather in Rome', prompt: 'What is the weather in Rome?' }],
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it('rejects an empty requested topic', () => {
    // Arrange / Act
    const result = explainCapabilityInputSchema.safeParse({
      requested: '',
      nearest: [{ label: 'Current weather', prompt: 'What is the weather?' }],
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects zero nearest-action chips, since a dead end needs a next step', () => {
    // Arrange / Act
    const result = explainCapabilityInputSchema.safeParse({
      requested: 'who won the world cup',
      nearest: [],
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects more than 3 nearest-action chips', () => {
    // Arrange / Act
    const result = explainCapabilityInputSchema.safeParse({
      requested: 'who won the world cup',
      nearest: Array.from({ length: 4 }, (_, index) => ({
        label: `Option ${index}`,
        prompt: `Prompt ${index}`,
      })),
    });

    // Assert
    expect(result.success).toBe(false);
  });
});
