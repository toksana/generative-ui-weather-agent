import type { VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import { Badge, type badgeVariants } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentWeatherData } from '@/lib/ai/tools/resolve-current-weather';
import { localTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Location, ToolStream } from '@/lib/weather/schemas';
import { describeWeatherCode, type WeatherSeverity } from '@/lib/weather/wmo';

import { AnimatedNumber } from './animated-number';
import { MetricSkeleton } from './metric-skeleton';
import { WeatherIcon } from './weather-icon';

const SEVERITY_BADGE_VARIANT: Record<WeatherSeverity, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  calm: 'default',
  mild: 'info',
  notable: 'warning',
  severe: 'destructive',
};

function Metric({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-foreground', className)}>{value}</dd>
    </div>
  );
}

function LocationHeader({ location }: { location: Location }) {
  return (
    <CardHeader className="flex-row items-baseline justify-between gap-2 space-y-0">
      <CardTitle>
        {location.name}
        <span className="ml-1 font-normal text-muted-foreground">
          {location.admin1 ? `${location.admin1}, ` : ''}
          {location.country}
        </span>
      </CardTitle>
      <span className="shrink-0 text-base text-muted-foreground md:text-lg">{localTime(location.timezone)}</span>
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
    <Card className="w-full max-w-md">
      {location ? (
        <LocationHeader location={location} />
      ) : (
        <CardHeader>
          <MetricSkeleton className="h-5 w-40" />
          {city && <p className="text-base text-muted-foreground md:text-lg">Finding {city}…</p>}
        </CardHeader>
      )}
      {(!location || pending) && (
        <CardContent className="flex items-center gap-3">
          <MetricSkeleton className="h-10 w-10 rounded-full" />
          <MetricSkeleton className="h-9 w-16" />
        </CardContent>
      )}
    </Card>
  );
}

type SingleCityCardProps = Extract<ToolStream<CurrentWeatherData>, { status: 'ready' }>;

function SingleCityCardBase({ location, data }: SingleCityCardProps) {
  const condition = describeWeatherCode(data.conditions.weatherCode);

  return (
    <Card className="w-full max-w-md">
      <LocationHeader location={location} />
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <WeatherIcon icon={condition.icon} className="text-4xl" />
          <AnimatedNumber
            value={data.conditions.temperature}
            suffix="°"
            className="text-4xl font-semibold text-foreground"
          />
          <Badge variant={SEVERITY_BADGE_VARIANT[condition.severity]}>{condition.label}</Badge>
        </div>
        <p className="text-base text-foreground/80 md:text-lg">{data.insight}</p>
        <dl className="grid grid-cols-3 gap-2 text-base md:text-lg">
          <Metric label="Feels like" value={<AnimatedNumber value={data.conditions.apparentTemperature} suffix="°" />} />
          <Metric
            label="Humidity"
            value={<AnimatedNumber value={data.conditions.relativeHumidity} suffix="%" />}
            className="font-medium text-info"
          />
          <Metric label="Wind" value={<AnimatedNumber value={data.conditions.windSpeed} suffix=" km/h" />} />
        </dl>
      </CardContent>
    </Card>
  );
}

export const SingleCityCard = Object.assign(SingleCityCardBase, { Frame });
