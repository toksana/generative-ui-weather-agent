import { describe, expect, it } from 'vitest';

import { explainCapability } from './explain-capability';

describe('explainCapability', () => {
  it('echoes the requested topic and nearest actions back as the tool output', async () => {
    // Arrange
    const input = {
      requested: 'weather in Rome in 1990',
      nearest: [{ label: 'Current weather in Rome', prompt: 'What is the weather in Rome?' }],
    };

    // Act
    if (!explainCapability.execute) throw new Error('expected an execute function');
    const result = await explainCapability.execute(input, {
      toolCallId: 'test',
      messages: [],
      context: {},
    });

    // Assert
    expect(result).toEqual(input);
  });
});
