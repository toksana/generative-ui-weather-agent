import { Component, type ReactNode } from 'react';

import { WeatherFallbackCard } from './weather-fallback-card';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  query?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * A class component because React only supports error boundaries via
 * `getDerivedStateFromError`/`componentDidCatch` — the one deliberate
 * exception to this codebase's otherwise-functional component style.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Widget crashed', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <WeatherFallbackCard reason="invalid_response" query={this.props.query} />;
    }
    return this.props.children;
  }
}
