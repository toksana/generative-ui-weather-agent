'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { ComparedCityUpdate } from '@/lib/ai/tools/compare-cities';
import type { CurrentWeatherData } from '@/lib/ai/tools/resolve-current-weather';
import { assertNever } from '@/lib/utils';
import type { ToolStream } from '@/lib/weather/schemas';
import { describeWeatherCode } from '@/lib/weather/wmo';

import { AnimatedNumber } from './animated-number';
import { MetricSkeleton } from './metric-skeleton';
import { REASON_COPY } from './weather-fallback-card';
import { SEVERITY_BADGE_VARIANT, temperatureRange } from './weather-format';
import { WeatherIcon } from './weather-icon';
import { WidgetErrorBoundary } from './widget-error-boundary';

interface ComparisonWidgetProps {
  toolCallId: string;
  cities: string[];
  update?: ComparedCityUpdate;
  onSuggestedPrompt?: (prompt: string) => void;
}

/**
 * Fixed city-identity colors, validated with the dataviz skill's palette
 * validator (adjacent pairlist — the right check for a line chart, since
 * identity is assigned by a city's position in `cities`, not by where its
 * line happens to sit on screen). Assigned by index, never by resolution
 * order, so a city's color stays stable regardless of which city's data
 * lands first.
 */
const COMPARE_COLORS = [
  'var(--color-compare-1)',
  'var(--color-compare-2)',
  'var(--color-compare-3)',
  'var(--color-compare-4)',
] as const;

const HOURS_SHOWN = 24;

type Results = Record<string, ToolStream<CurrentWeatherData>>;

interface ChartPoint {
  offset: number;
  label: string;
  [city: string]: number | string;
}

function cityDisplayName(city: string, result: ToolStream<CurrentWeatherData> | undefined): string {
  return result?.status === 'ready' ? result.location.name : city;
}

function buildChartData(cities: string[], results: Results): ChartPoint[] {
  const ready = cities.filter((city) => results[city]?.status === 'ready');
  if (ready.length === 0) return [];

  return Array.from({ length: HOURS_SHOWN }, (_, offset) => {
    const point: ChartPoint = { offset, label: offset === 0 ? 'Now' : `+${offset}h` };
    for (const city of ready) {
      const result = results[city];
      if (result?.status === 'ready' && offset < result.data.hourly.temperature.length) {
        point[city] = Math.round(result.data.hourly.temperature[offset]);
      }
    }
    return point;
  });
}

function ChartTooltipContent({
  active,
  payload,
  results,
}: Partial<TooltipContentProps<number, string>> & { results: Results }) {
  if (!active || !payload || payload.length === 0) return null;
  const offset = (payload[0]?.payload as ChartPoint | undefined)?.offset;

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 text-sm shadow-md">
      {payload.map((entry) => {
        const city = entry.dataKey as string;
        const result = results[city];
        const localTime = result?.status === 'ready' && typeof offset === 'number' ? result.data.hourly.time[offset]?.split('T')[1] : undefined;
        return (
          <div key={city} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{cityDisplayName(city, result)}</span>
            {localTime && <span className="text-xs text-muted-foreground">{localTime}</span>}
            <span className="ml-auto font-mono font-medium text-foreground">{entry.value}°</span>
          </div>
        );
      })}
    </div>
  );
}

function ComparisonChart({ cities, results }: { cities: string[]; results: Results }) {
  const points = buildChartData(cities, results);
  const readyCities = cities.filter((city) => results[city]?.status === 'ready');
  const tickInterval = Math.max(1, Math.ceil(points.length / 6) - 1);

  if (readyCities.length === 0) {
    return <MetricSkeleton className="h-[260px] w-full" />;
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} interval={tickInterval} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="°" width={40} />
          <Tooltip content={<ChartTooltipContent results={results} />} />
          {/* Recharts' Legend defaults to alphabetically sorting entries by
              `value` (`itemSorter: "value"`) — disable that so legend order
              matches the fixed `cities` order the Lines above mount in. */}
          <Legend
            itemSorter={null}
            formatter={(value) => cityDisplayName(value, results[value])}
            wrapperStyle={{ fontSize: 12 }}
          />
          {/* Always mount one Line per city, in fixed `cities` order — a city that
              hasn't resolved yet simply has no points for its dataKey, but keeping
              every Line mounted up front keeps the legend's order stable instead of
              reordering itself by arrival order (`mergeAsResolved` in
              compare-cities.ts settles cities out of order). */}
          {cities.map((city, index) => (
            <Line
              key={city}
              type="monotone"
              dataKey={city}
              name={city}
              stroke={COMPARE_COLORS[index % COMPARE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompareRow({
  city,
  index,
  result,
  onSuggestedPrompt,
}: {
  city: string;
  index: number;
  result: ToolStream<CurrentWeatherData> | undefined;
  onSuggestedPrompt?: (prompt: string) => void;
}) {
  const color = COMPARE_COLORS[index % COMPARE_COLORS.length];

  return (
    <WidgetErrorBoundary query={city}>
      <AnimatePresence mode="wait">
        <motion.div
          key={result?.status ?? 'pending'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {(() => {
            if (!result || result.status === 'resolving' || result.status === 'located') {
              const label = result?.status === 'located' ? result.location.name : city;
              return (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <MetricSkeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <MetricSkeleton className="h-4 w-24" />
                    <p className="truncate text-sm text-muted-foreground">Finding {label}…</p>
                  </div>
                </div>
              );
            }

            if (result.status === 'failed') {
              return (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      Couldn&apos;t get the weather for &quot;{result.query}&quot;.
                    </p>
                    <p className="text-xs text-muted-foreground">{REASON_COPY[result.reason]}</p>
                  </div>
                  {onSuggestedPrompt && (
                    <Chip type="button" onClick={() => onSuggestedPrompt(result.query)} className="shrink-0">
                      Try again
                    </Chip>
                  )}
                </div>
              );
            }

            if (result.status === 'ready') {
              const condition = describeWeatherCode(result.data.conditions.weatherCode);
              const range = temperatureRange(result.data.hourly.temperature);

              return (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-medium text-foreground">{result.location.name}</span>
                      <Badge variant={SEVERITY_BADGE_VARIANT[condition.severity]}>
                        <WeatherIcon icon={condition.icon} />
                        {condition.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <AnimatedNumber
                        value={result.data.conditions.temperature}
                        suffix="°"
                        className="font-mono text-2xl font-semibold text-foreground"
                      />
                      {range && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(range.low)}° / {Math.round(range.high)}°
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{result.data.insight}</p>
                  </div>
                </div>
              );
            }

            return assertNever(result);
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
  const [results, setResults] = useState<Results>({});
  const [seen, setSeen] = useState<ComparedCityUpdate | undefined>(undefined);

  if (update && update !== seen) {
    setSeen(update);
    setResults((prev) => ({ ...prev, [update.city]: update.result }));
  }

  return (
    <Card className="w-full" data-testid={`comparison-widget-${toolCallId}`}>
      <CardHeader>
        <CardTitle>Comparing {cities.length} cities</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <ComparisonChart cities={cities} results={results} />
        <div className="flex flex-col gap-2">
          {cities.map((city, index) => (
            <CompareRow
              key={city}
              city={city}
              index={index}
              result={results[city]}
              onSuggestedPrompt={onSuggestedPrompt}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
