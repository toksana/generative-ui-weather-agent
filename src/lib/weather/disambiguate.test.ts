import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { hasAmbiguousMatch } from './disambiguate';
import type { Location } from './schemas';

function location(overrides: Partial<Location> = {}): Location {
  return {
    name: faker.location.city(),
    country: faker.location.country(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    timezone: 'Europe/London',
    ...overrides,
  };
}

describe('hasAmbiguousMatch', () => {
  it('is not ambiguous for a single candidate', () => {
    // Arrange
    const candidates = [location()];

    // Act
    const result = hasAmbiguousMatch(candidates);

    // Assert
    expect(result).toBe(false);
  });

  it('is not ambiguous when every candidate shares one country', () => {
    // Arrange
    const candidates = [
      location({ name: 'Springfield', country: 'United States', admin1: 'Illinois' }),
      location({ name: 'Springfield', country: 'United States', admin1: 'Missouri' }),
    ];

    // Act
    const result = hasAmbiguousMatch(candidates);

    // Assert
    expect(result).toBe(false);
  });

  it('is ambiguous when a name is shared across countries', () => {
    // Arrange
    const candidates = [
      location({ name: 'Springfield', country: 'United States' }),
      location({ name: 'Springfield', country: 'United Kingdom' }),
    ];

    // Act
    const result = hasAmbiguousMatch(candidates);

    // Assert
    expect(result).toBe(true);
  });

  it('is not ambiguous for an empty candidate list', () => {
    // Arrange
    const candidates: Location[] = [];

    // Act
    const result = hasAmbiguousMatch(candidates);

    // Assert
    expect(result).toBe(false);
  });
});
