import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnimatedNumber } from './animated-number';

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return { ...actual, useReducedMotion: () => true };
});

describe('AnimatedNumber', () => {
  it('renders the value with suffix immediately when reduced motion is preferred', () => {
    // Arrange & Act
    render(<AnimatedNumber value={18.4} decimals={0} suffix="°" />);

    // Assert
    expect(screen.getByText('18°')).toBeInTheDocument();
  });

  it('applies decimals', () => {
    // Arrange & Act
    render(<AnimatedNumber value={55} decimals={1} suffix="%" />);

    // Assert
    expect(screen.getByText('55.0%')).toBeInTheDocument();
  });
});
