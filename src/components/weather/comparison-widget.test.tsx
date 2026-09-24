import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComparisonWidget } from './comparison-widget';

describe('ComparisonWidget', () => {
  it('lays out as a wrapping grid for fewer than 3 cities', () => {
    // Arrange & Act
    const { container } = render(<ComparisonWidget toolCallId="call-1" cities={['Tokyo', 'Osaka']} />);

    // Assert
    const grid = container.firstElementChild;
    expect(grid).toHaveClass('grid');
    expect(grid).not.toHaveClass('overflow-x-auto');
  });

  it('stays a wrapping grid (never a horizontal scroll strip) at 3 or more cities', () => {
    // Arrange & Act
    const { container } = render(
      <ComparisonWidget toolCallId="call-1" cities={['Tokyo', 'Osaka', 'Kyoto']} />,
    );

    // Assert
    const grid = container.firstElementChild;
    expect(grid).toHaveClass('grid');
    expect(grid).not.toHaveClass('overflow-x-auto', 'snap-x');
  });

  it('renders a skeleton frame per city before any update arrives', () => {
    // Arrange & Act
    render(<ComparisonWidget toolCallId="call-1" cities={['Tokyo', 'Osaka', 'Kyoto']} />);

    // Assert
    expect(screen.getByText('Finding Tokyo…')).toBeInTheDocument();
    expect(screen.getByText('Finding Osaka…')).toBeInTheDocument();
    expect(screen.getByText('Finding Kyoto…')).toBeInTheDocument();
  });

  it('renders a failure card with no crash when a city fails to resolve', () => {
    // Arrange & Act
    render(
      <ComparisonWidget
        toolCallId="call-1"
        cities={['Tokyo', 'Nowhereville']}
        update={{ city: 'Nowhereville', result: { status: 'failed', query: 'Nowhereville', reason: 'not_found' } }}
      />,
    );

    // Assert
    expect(screen.getByText('Couldn\'t get the weather for "Nowhereville".')).toBeInTheDocument();
    expect(screen.getByText('Finding Tokyo…')).toBeInTheDocument();
  });
});
