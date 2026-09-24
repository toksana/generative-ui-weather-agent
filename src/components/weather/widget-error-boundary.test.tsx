import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WidgetErrorBoundary } from './widget-error-boundary';

function Throws(): never {
  throw new Error('boom');
}

describe('WidgetErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    // Arrange & Act
    render(
      <WidgetErrorBoundary>
        <p>ok</p>
      </WidgetErrorBoundary>,
    );

    // Assert
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders a fallback card instead of crashing when a child throws', () => {
    // Arrange
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    render(
      <WidgetErrorBoundary query="Tokyo">
        <Throws />
      </WidgetErrorBoundary>,
    );

    // Assert
    expect(screen.getByText('Couldn\'t get the weather for "Tokyo".')).toBeInTheDocument();
  });
});
