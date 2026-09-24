import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SuggestedPrompts } from './suggested-prompts';

describe('SuggestedPrompts', () => {
  it('renders four seeded prompts', () => {
    // Arrange & Act
    render(<SuggestedPrompts onSelectPrompt={vi.fn()} />);

    // Assert
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('calls onSelectPrompt with the exact prompt text when a chip is clicked', async () => {
    // Arrange
    const onSelectPrompt = vi.fn();
    const user = userEvent.setup();
    render(<SuggestedPrompts onSelectPrompt={onSelectPrompt} />);

    // Act
    await user.click(screen.getByText("What's the weather like in Tokyo right now?"));

    // Assert
    expect(onSelectPrompt).toHaveBeenCalledWith("What's the weather like in Tokyo right now?");
  });
});
