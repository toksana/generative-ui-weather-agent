import { describe, expect, it } from 'vitest';

import { partKey, type MessagePart } from './part-key';

describe('partKey', () => {
  it('uses the toolCallId when the part has one', () => {
    // Arrange
    const part = { type: 'tool-showCurrentWeather', toolCallId: 'call-123' } as MessagePart;

    // Act
    const key = partKey(part, 0);

    // Assert
    expect(key).toBe('call-123');
  });

  it('falls back to type-index when the part has no toolCallId', () => {
    // Arrange
    const part = { type: 'text', text: 'hello' } as MessagePart;

    // Act
    const key = partKey(part, 2);

    // Assert
    expect(key).toBe('text-2');
  });
});
