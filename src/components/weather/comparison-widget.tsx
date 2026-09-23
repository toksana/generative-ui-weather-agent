'use client';

import { useState } from 'react';

import type { ComparedCityUpdate } from '@/lib/ai/tools/compare-cities';
import type { CurrentWeatherData } from '@/lib/ai/tools/resolve-current-weather';
import { assertNever } from '@/lib/utils';
import type { ToolStream } from '@/lib/weather/schemas';

import { DisambiguationCard } from './disambiguation-card';
import { SingleCityCard } from './single-city-card';
import { WeatherFallbackCard } from './weather-fallback-card';

interface ComparisonWidgetProps {
  cities: string[];
  update?: ComparedCityUpdate;
  onSuggestedPrompt?: (prompt: string) => void;
}

function CityResult({
  city,
  result,
  onSuggestedPrompt,
}: {
  city: string;
  result: ToolStream<CurrentWeatherData> | undefined;
  onSuggestedPrompt?: (prompt: string) => void;
}) {
  if (!result) return <SingleCityCard.Frame city={city} />;

  switch (result.status) {
    case 'resolving':
      return <SingleCityCard.Frame city={result.query} />;
    case 'located':
      return <SingleCityCard.Frame location={result.location} pending />;
    case 'ready':
      return <SingleCityCard {...result} />;
    case 'failed':
      return <WeatherFallbackCard reason={result.reason} query={result.query} />;
    case 'ambiguous':
      return (
        <DisambiguationCard query={result.query} candidates={result.candidates} onSelectCandidate={onSuggestedPrompt} />
      );
    default:
      return assertNever(result);
  }
}

/**
 * Each `compareCities` yield replaces the tool part's `output` with a single
 * city's update (merge-as-resolved, not a growing array), so the widget
 * accumulates those per-city updates itself, keyed by city, across renders —
 * adjusted during render (React's documented pattern for state derived from
 * a changing prop) rather than in an effect, since an effect's extra commit
 * isn't needed here and its setState would run one render late.
 */
export function ComparisonWidget({ cities, update, onSuggestedPrompt }: ComparisonWidgetProps) {
  const [results, setResults] = useState<Record<string, ToolStream<CurrentWeatherData>>>({});
  const [seen, setSeen] = useState<ComparedCityUpdate | undefined>(undefined);

  if (update && update !== seen) {
    setSeen(update);
    setResults((prev) => ({ ...prev, [update.city]: update.result }));
  }

  return (
    <div className="flex w-full max-w-3xl flex-wrap gap-3">
      {cities.map((city) => (
        <CityResult key={city} city={city} result={results[city]} onSuggestedPrompt={onSuggestedPrompt} />
      ))}
    </div>
  );
}
