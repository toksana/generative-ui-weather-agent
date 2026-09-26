import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ComparedCityUpdate } from '@/lib/ai/tools/compare-cities';
import type { CurrentWeatherData } from '@/lib/ai/tools/resolve-current-weather';
import type { ToolStream } from '@/lib/weather/schemas';

import { ComparisonWidget } from './comparison-widget';

function readyUpdate(city: string, locationName: string, temperature: number): ComparedCityUpdate {
  const data: CurrentWeatherData = {
    conditions: {
      temperature,
      apparentTemperature: temperature,
      relativeHumidity: 50,
      precipitation: 0,
      weatherCode: 0,
      windSpeed: 10,
      isDay: true,
    },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => `2026-09-26T${String(i).padStart(2, '0')}:00`),
      temperature: Array.from({ length: 24 }, () => temperature),
      precipitationProbability: Array.from({ length: 24 }, () => 0),
      precipitation: Array.from({ length: 24 }, () => 0),
    },
    insight: `${locationName} insight`,
  };
  const result: ToolStream<CurrentWeatherData> = {
    status: 'ready',
    location: {
      name: locationName,
      country: 'Testland',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    },
    data,
  };
  return { city, result };
}

describe('ComparisonWidget', () => {
  it('renders a skeleton row per city before any update arrives', () => {
    // Arrange & Act
    render(<ComparisonWidget toolCallId="call-1" cities={['Tokyo', 'Osaka', 'Kyoto']} />);

    // Assert
    expect(screen.getByText('Finding Tokyo…')).toBeInTheDocument();
    expect(screen.getByText('Finding Osaka…')).toBeInTheDocument();
    expect(screen.getByText('Finding Kyoto…')).toBeInTheDocument();
  });

  it('renders a failure row with no crash when a city fails to resolve', () => {
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

  it('renders a resolved city with its name, temperature, and low/high range', () => {
    // Arrange & Act
    render(
      <ComparisonWidget
        toolCallId="call-1"
        cities={['Tokyo', 'Osaka']}
        update={readyUpdate('Tokyo', 'Tokyo', 22)}
      />,
    );

    // Assert
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('22°')).toBeInTheDocument();
    expect(screen.getByText('22° / 22°')).toBeInTheDocument();
    expect(screen.getByText('Finding Osaka…')).toBeInTheDocument();
  });

  it('keeps a stable row order (input order) regardless of which city resolves first', () => {
    // Arrange & Act
    const { rerender } = render(
      <ComparisonWidget
        toolCallId="call-1"
        cities={['Tokyo', 'Osaka']}
        update={readyUpdate('Osaka', 'Osaka', 18)}
      />,
    );
    rerender(
      <ComparisonWidget
        toolCallId="call-1"
        cities={['Tokyo', 'Osaka']}
        update={readyUpdate('Osaka', 'Osaka', 18)}
      />,
    );

    // Assert
    const rows = screen.getAllByText(/Finding Tokyo…|Osaka/);
    expect(rows[0]).toHaveTextContent('Finding Tokyo…');
  });
});
