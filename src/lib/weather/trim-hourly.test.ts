import { describe, expect, it } from 'vitest';

import { trimHourly } from './trim-hourly';
import type { HourlyForecast } from './schemas';

const fortyEightHours: HourlyForecast = {
  time: Array.from({ length: 48 }, (_, index) => `2026-09-14T${String(index % 24).padStart(2, '0')}:00`),
  temperature: Array.from({ length: 48 }, (_, index) => index),
  precipitationProbability: Array.from({ length: 48 }, (_, index) => index),
  precipitation: Array.from({ length: 48 }, (_, index) => index),
};

describe('trimHourly', () => {
  it('keeps only the first N hours across every parallel series', () => {
    // Arrange / Act
    const trimmed = trimHourly(fortyEightHours, 3);

    // Assert
    expect(trimmed).toEqual({
      time: fortyEightHours.time.slice(0, 3),
      temperature: [0, 1, 2],
      precipitationProbability: [0, 1, 2],
      precipitation: [0, 1, 2],
    });
  });

  it('is a no-op when N covers the whole series', () => {
    // Arrange / Act
    const trimmed = trimHourly(fortyEightHours, 48);

    // Assert
    expect(trimmed).toEqual(fortyEightHours);
  });

  it('never returns more hours than the series has, even if N is larger', () => {
    // Arrange / Act
    const trimmed = trimHourly(fortyEightHours, 100);

    // Assert
    expect(trimmed.time).toHaveLength(48);
  });
});
