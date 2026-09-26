import { ArrowDown, ArrowUp, CloudRain, Droplets, Wind as WindIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentWeatherData } from '@/lib/ai/tools/resolve-current-weather';
import { localTime } from '@/lib/time';
import { assertNever } from '@/lib/utils';
import type { Location, ToolStream } from '@/lib/weather/schemas';
import { describeWeatherCode } from '@/lib/weather/wmo';

import { AnimatedNumber } from './animated-number';
import { MetricSkeleton } from './metric-skeleton';
import { StatCard } from './stat-card';
import { WeatherFallbackCard } from './weather-fallback-card';
import { WeatherIcon } from './weather-icon';
import { SEVERITY_BADGE_VARIANT, temperatureRange } from './weather-format';
import { WidgetErrorBoundary } from './widget-error-boundary';

function LocationHeader({ location, badge }: { location: Location; badge?: ReactNode }) {
  return (
    <CardHeader>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current conditions</p>
        <CardTitle className="mt-0.5 truncate text-xl font-semibold">
          {location.name}
          <span className="ml-1 font-normal text-muted-foreground">
            {location.admin1 ? `${location.admin1}, ` : ''}
            {location.country}
          </span>
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{localTime(location.timezone)}</p>
      </div>
      {badge && <CardAction>{badge}</CardAction>}
    </CardHeader>
  );
}

interface FrameProps {
  city?: string;
  location?: Location;
  pending?: boolean;
}

function Frame({ city, location, pending }: FrameProps) {
  return (
    <Card className="w-full">
      {location ? (
        <LocationHeader location={location} />
      ) : (
        <CardHeader>
          <div className="min-w-0 space-y-1.5">
            <MetricSkeleton className="h-3 w-28" />
            <MetricSkeleton className="h-5 w-40" />
            {city && <p className="text-sm text-muted-foreground">Finding {city}…</p>}
          </div>
        </CardHeader>
      )}
      {(!location || pending) && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <MetricSkeleton className="h-14 w-32" />
            <MetricSkeleton className="h-4 w-24" />
          </div>
          <div className="border-t border-border" />
          <div className="grid grid-cols-3 gap-2">
            <MetricSkeleton className="h-16 rounded-lg" />
            <MetricSkeleton className="h-16 rounded-lg" />
            <MetricSkeleton className="h-16 rounded-lg" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

type SingleCityCardProps = Extract<ToolStream<CurrentWeatherData>, { status: 'ready' }>;

function SingleCityCardBase({ location, data }: SingleCityCardProps) {
  const condition = describeWeatherCode(data.conditions.weatherCode);
  const range = temperatureRange(data.hourly.temperature);

  return (
    <Card className="w-full">
      <LocationHeader
        location={location}
        badge={
          <Badge variant={SEVERITY_BADGE_VARIANT[condition.severity]}>
            <WeatherIcon icon={condition.icon} />
            {condition.label}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <AnimatedNumber
              value={data.conditions.temperature}
              suffix="°"
              className="font-mono text-6xl font-semibold tracking-tight text-foreground md:text-7xl"
            />
            <span className="text-sm text-muted-foreground">
              Feels like <AnimatedNumber value={data.conditions.apparentTemperature} suffix="°C" />
            </span>
          </div>
          {range && (
            <div className="mt-1 flex items-center gap-3 text-sm font-semibold text-info [&_svg]:size-3.5">
              <span className="inline-flex items-center gap-1">
                <ArrowDown aria-hidden="true" />
                {Math.round(range.low)}°
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowUp aria-hidden="true" />
                {Math.round(range.high)}°
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-foreground/80">{data.insight}</p>
        <div className="border-t border-border" />
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon={Droplets}
            label="Humidity"
            value={<AnimatedNumber value={data.conditions.relativeHumidity} suffix="%" />}
            progress={{ value: data.conditions.relativeHumidity }}
          />
          <StatCard
            icon={WindIcon}
            label="Wind"
            value={<AnimatedNumber value={data.conditions.windSpeed} suffix=" km/h" />}
          />
          <StatCard
            icon={CloudRain}
            label="Precip"
            value={<AnimatedNumber value={data.conditions.precipitation} decimals={1} suffix=" mm" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StreamProps {
  toolCallId: string;
  stream: ToolStream<CurrentWeatherData>;
  onSuggestedPrompt?: (prompt: string) => void;
}

function streamQuery(stream: ToolStream<CurrentWeatherData>): string | undefined {
  switch (stream.status) {
    case 'resolving':
    case 'failed':
      return stream.query;
    case 'located':
    case 'ready':
      return stream.location.name;
    default:
      return assertNever(stream);
  }
}

function Stream({ stream, onSuggestedPrompt }: StreamProps) {
  return (
    <WidgetErrorBoundary query={streamQuery(stream)}>
      <AnimatePresence mode="wait">
        <motion.div key={stream.status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {(() => {
            switch (stream.status) {
              case 'resolving':
                return <Frame city={stream.query} />;
              case 'located':
                return <Frame location={stream.location} pending />;
              case 'ready':
                return <SingleCityCardBase {...stream} />;
              case 'failed':
                return (
                  <WeatherFallbackCard
                    reason={stream.reason}
                    query={stream.query}
                    onRetry={() => onSuggestedPrompt?.(stream.query)}
                  />
                );
              default:
                return assertNever(stream);
            }
          })()}
        </motion.div>
      </AnimatePresence>
    </WidgetErrorBoundary>
  );
}

export const SingleCityCard = Object.assign(SingleCityCardBase, { Frame, Stream });
