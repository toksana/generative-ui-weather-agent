import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './theme-toggle';

function mockMatchMedia(prefersDark: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark && query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light and does not add the dark class when nothing is stored and the system prefers light', () => {
    // Arrange
    mockMatchMedia(false);

    // Act
    render(<ThemeToggle />);

    // Assert
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('respects the system dark preference when no theme is stored', () => {
    // Arrange
    mockMatchMedia(true);

    // Act
    render(<ThemeToggle />);

    // Assert
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('toggles the dark class and persists the choice on click', async () => {
    // Arrange
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);

    // Act
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    // Assert
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
