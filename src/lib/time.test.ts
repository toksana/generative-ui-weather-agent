import { describe, expect, it } from 'vitest';

import { localTime } from './time';

describe('localTime', () => {
  it('formats the current time for a valid IANA timezone', () => {
    // Arrange
    const timezone = 'Asia/Tokyo';

    // Act
    const result = localTime(timezone);

    // Assert
    expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/);
  });

  it('returns null for an invalid timezone', () => {
    // Arrange
    const timezone = 'Not/A_Timezone';

    // Act
    const result = localTime(timezone);

    // Assert
    expect(result).toBeNull();
  });
});
