import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { KNOWN_WEATHER_CODES, describeWeatherCode } from './wmo';

describe('describeWeatherCode', () => {
  it.each([
    [0, 'clear', 'calm'],
    [1, 'clear', 'calm'],
    [2, 'partly-cloudy', 'calm'],
    [3, 'cloudy', 'calm'],
    [45, 'fog', 'mild'],
    [48, 'fog', 'mild'],
    [51, 'drizzle', 'mild'],
    [53, 'drizzle', 'mild'],
    [55, 'drizzle', 'mild'],
    [56, 'freezing-rain', 'mild'],
    [57, 'freezing-rain', 'mild'],
    [61, 'rain', 'notable'],
    [63, 'rain', 'notable'],
    [65, 'rain', 'severe'],
    [66, 'freezing-rain', 'notable'],
    [67, 'freezing-rain', 'severe'],
    [71, 'snow', 'notable'],
    [73, 'snow', 'notable'],
    [75, 'snow', 'severe'],
    [77, 'snow', 'notable'],
    [80, 'showers', 'notable'],
    [81, 'showers', 'notable'],
    [82, 'showers', 'severe'],
    [85, 'snow-showers', 'notable'],
    [86, 'snow-showers', 'severe'],
    [95, 'thunderstorm', 'severe'],
    [96, 'thunderstorm', 'severe'],
    [99, 'thunderstorm', 'severe'],
  ])('maps code %i to the %s icon at %s severity', (code, icon, severity) => {
    // Arrange / Act
    const condition = describeWeatherCode(code);

    // Assert
    expect(condition).toEqual({
      code,
      label: expect.any(String),
      icon,
      severity,
    });
  });

  it('gives every known code a non-empty, human-readable label', () => {
    // Arrange
    const codes = KNOWN_WEATHER_CODES;

    // Act
    const labels = codes.map((code) => describeWeatherCode(code).label);

    // Assert
    expect(labels).toHaveLength(codes.length);
    labels.forEach((label) => {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).toMatch(/^[A-Z]/);
    });
  });

  it('gives each distinct condition a distinct label', () => {
    // Arrange
    const codes = KNOWN_WEATHER_CODES;

    // Act
    const labels = codes.map((code) => describeWeatherCode(code).label);

    // Assert — 0 and 1 are both "clear" but must read differently to the user
    expect(new Set(labels).size).toBe(codes.length);
  });

  it('falls back to the unknown condition for codes outside the WMO table', () => {
    // Arrange
    const unmappedCode = faker.helpers.arrayElement(
      Array.from({ length: 100 }, (_, index) => index).filter(
        (code) => !KNOWN_WEATHER_CODES.includes(code),
      ),
    );

    // Act
    const condition = describeWeatherCode(unmappedCode);

    // Assert
    expect(condition).toEqual({
      code: unmappedCode,
      label: 'Unknown conditions',
      icon: 'unknown',
      severity: 'calm',
    });
  });

  it.each([-1, 1.5, 1000, Number.NaN])(
    'falls back to the unknown condition for the malformed code %p',
    (code) => {
      // Arrange / Act
      const condition = describeWeatherCode(code);

      // Assert
      expect(condition.icon).toBe('unknown');
      expect(condition.severity).toBe('calm');
    },
  );
});
