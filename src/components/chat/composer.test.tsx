import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Composer } from './composer';

describe('Composer', () => {
  it('submits the trimmed text and clears the input on Enter', async () => {
    // Arrange
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText('Ask about the weather anywhere…');

    // Act
    await user.type(input, '  What is the weather in Tokyo?  {Enter}');

    // Assert
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('What is the weather in Tokyo?');
    expect(input).toHaveValue('');
  });

  it('submits via the Send button click', async () => {
    // Arrange
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText('Ask about the weather anywhere…');

    // Act
    await user.type(input, 'Compare London and Paris');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // Assert
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Compare London and Paris');
  });

  it('does not submit whitespace-only input and disables the Send button', () => {
    // Arrange
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);

    // Assert
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('disables the input and Send button when disabled is passed', () => {
    // Arrange
    const onSubmit = vi.fn();

    // Act
    render(<Composer disabled onSubmit={onSubmit} />);

    // Assert
    expect(screen.getByPlaceholderText('Ask about the weather anywhere…')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
