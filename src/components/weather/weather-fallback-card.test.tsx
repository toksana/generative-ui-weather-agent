import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WeatherFallbackCard } from './weather-fallback-card';

describe('WeatherFallbackCard', () => {
  it('does not render a retry chip when onRetry is not passed', () => {
    // Arrange & Act
    render(<WeatherFallbackCard reason="not_found" query="Nowhereville" />);

    // Assert
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('calls onRetry once when the retry chip is clicked', async () => {
    // Arrange
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<WeatherFallbackCard reason="timeout" query="Paris" onRetry={onRetry} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Assert
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
