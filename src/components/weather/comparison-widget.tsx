'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import type { ComparedCityUpdate } from '@/lib/ai/tools/compare-cities';
import type { CurrentWeatherData } from '@/lib/ai/tools/resolve-current-weather';
import { assertNever, cn } from '@/lib/utils';
import type { ToolStream } from '@/lib/weather/schemas';

import { SingleCityCard } from './single-city-card';
import { WeatherFallbackCard } from './weather-fallback-card';
import { WidgetErrorBoundary } from './widget-error-boundary';

interface ComparisonWidgetProps {
  toolCallId: string;
  cities: string[];
  update?: ComparedCityUpdate;
  onSuggestedPrompt?: (prompt: string) => void;
}

function CityResult({
  toolCallId,
  city,
  result,
  onSuggestedPrompt,
}: {
  toolCallId: string;
  city: string;
  result: ToolStream<CurrentWeatherData> | undefined;
  onSuggestedPrompt?: (prompt: string) => void;
}) {
  return (
    <WidgetErrorBoundary query={city}>
      <AnimatePresence mode="popLayout">
        <motion.div key={result?.status ?? 'pending'} layout layoutId={`weather-card-${toolCallId}-${city}`}>
          {(() => {
            if (!result) return <SingleCityCard.Frame city={city} />;

            switch (result.status) {
              case 'resolving':
                return <SingleCityCard.Frame city={result.query} />;
              case 'located':
                return <SingleCityCard.Frame location={result.location} pending />;
              case 'ready':
                return <SingleCityCard {...result} />;
              case 'failed':
                return (
                  <WeatherFallbackCard
                    reason={result.reason}
                    query={result.query}
                    onRetry={() => onSuggestedPrompt?.(result.query)}
                  />
                );
              default:
                return assertNever(result);
            }
          })()}
        </motion.div>
      </AnimatePresence>
    </WidgetErrorBoundary>
  );
}

/**
 * Each `compareCities` yield replaces the tool part's `output` with a single
 * city's update (merge-as-resolved, not a growing array), so the widget
 * accumulates those per-city updates itself, keyed by city, across renders —
 * adjusted during render (React's documented pattern for state derived from
 * a changing prop) rather than in an effect, since an effect's extra commit
 * isn't needed here and its setState would run one render late.
 */
export function ComparisonWidget({ toolCallId, cities, update, onSuggestedPrompt }: ComparisonWidgetProps) {
  const [results, setResults] = useState<Record<string, ToolStream<CurrentWeatherData>>>({});
  const [seen, setSeen] = useState<ComparedCityUpdate | undefined>(undefined);

  if (update && update !== seen) {
    setSeen(update);
    setResults((prev) => ({ ...prev, [update.city]: update.result }));
  }

  const strip = cities.length >= 3;

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        strip ? 'snap-x snap-mandatory overflow-x-auto scroll-px-4 pb-2' : 'max-w-3xl flex-wrap',
      )}
    >
      {cities.map((city) => (
        <div key={city} className={cn(strip && 'w-[85vw] max-w-[22rem] shrink-0 snap-start')}>
          <CityResult toolCallId={toolCallId} city={city} result={results[city]} onSuggestedPrompt={onSuggestedPrompt} />
        </div>
      ))}
    </div>
  );
}
