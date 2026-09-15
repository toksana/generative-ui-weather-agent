import { describe, expect, it } from 'vitest';

import { buildInsight } from './insight';
import type { CurrentConditions, HourlyForecast } from './schemas';

function currentConditions(overrides: Partial<CurrentConditions> = {}): CurrentConditions {
  return {
    temperature: 18,
    apparentTemperature: 18,
    relativeHumidity: 55,
    precipitation: 0,
    weatherCode: 0,
    windSpeed: 10,
    isDay: true,
    ...overrides,
  };
}

function hourly(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  const hours = 6;
  return {
    time: Array.from({ length: hours }, (_, i) => `2026-09-14T${12 + i}:00`),
    temperature: Array.from({ length: hours }, () => 20),
    precipitationProbability: Array.from({ length: hours }, () => 5),
    precipitation: Array.from({ length: hours }, () => 0),
    ...overrides,
  };
}

describe('buildInsight', () => {
  it('flags when it feels notably colder than the actual temperature', () => {
    // Arrange
    const conditions = currentConditions({ temperature: 10, apparentTemperature: 3 });

    // Act
    const insight = buildInsight({ conditions, hourly: hourly() });

    // Assert
    expect(insight.toLowerCase()).toContain('feels');
    expect(insight.toLowerCase()).toContain('colder');
  });

  it('flags when it feels notably warmer than the actual temperature', () => {
    // Arrange
    const conditions = currentConditions({ temperature: 30, apparentTemperature: 38 });

    // Act
    const insight = buildInsight({ conditions, hourly: hourly() });

    // Assert
    expect(insight.toLowerCase()).toContain('warmer');
  });

  it('does not mention feels-like when the gap is small', () => {
    // Arrange
    const conditions = currentConditions({ temperature: 18, apparentTemperature: 19 });

    // Act
    const insight = buildInsight({ conditions, hourly: hourly() });

    // Assert
    expect(insight.toLowerCase()).not.toContain('feels');
  });

  it('flags upcoming rain when a later hour crosses the probability threshold', () => {
    // Arrange
    const conditions = currentConditions();
    const forecast = hourly({
      precipitationProbability: [10, 10, 20, 65, 70, 40],
    });

    // Act
    const insight = buildInsight({ conditions, hourly: forecast });

    // Assert
    expect(insight.toLowerCase()).toContain('rain');
  });

  it('does not claim rain is coming when probability stays low all period', () => {
    // Arrange
    const conditions = currentConditions();
    const forecast = hourly({ precipitationProbability: [5, 10, 15, 20, 10, 5] });

    // Act
    const insight = buildInsight({ conditions, hourly: forecast });

    // Assert
    expect(insight.toLowerCase()).not.toContain('rain');
  });

  it('falls back to a plain-conditions summary when nothing notable is happening', () => {
    // Arrange
    const conditions = currentConditions({ temperature: 18, apparentTemperature: 18, weatherCode: 0 });
    const forecast = hourly({ precipitationProbability: [5, 5, 5, 5, 5, 5] });

    // Act
    const insight = buildInsight({ conditions, hourly: forecast });

    // Assert
    expect(insight.length).toBeGreaterThan(0);
    expect(insight.toLowerCase()).toContain('clear');
  });

  it('prioritizes the feels-like gap over an upcoming-rain note when both apply', () => {
    // Arrange — a genuinely cold snap matters more to lead with than distant rain
    const conditions = currentConditions({ temperature: 5, apparentTemperature: -3 });
    const forecast = hourly({ precipitationProbability: [10, 10, 70, 70, 70, 70] });

    // Act
    const insight = buildInsight({ conditions, hourly: forecast });

    // Assert
    expect(insight.toLowerCase()).toContain('colder');
  });

  it('is deterministic for the same inputs', () => {
    // Arrange
    const conditions = currentConditions({ temperature: 5, apparentTemperature: -2 });
    const forecast = hourly({ precipitationProbability: [80, 80, 80, 80, 80, 80] });

    // Act
    const first = buildInsight({ conditions, hourly: forecast });
    const second = buildInsight({ conditions, hourly: forecast });

    // Assert
    expect(first).toBe(second);
  });
});
