import type { VariantProps } from 'class-variance-authority';

import type { badgeVariants } from '@/components/ui/badge';
import type { WeatherSeverity } from '@/lib/weather/wmo';

export const SEVERITY_BADGE_VARIANT: Record<
  WeatherSeverity,
  NonNullable<VariantProps<typeof badgeVariants>['variant']>
> = {
  calm: 'default',
  mild: 'info',
  notable: 'warning',
  severe: 'destructive',
};

/** Today's low/high, derived from the already-fetched hourly forecast (first 24h ≈ local today). */
export function temperatureRange(hourlyTemperature: number[]): { low: number; high: number } | undefined {
  const today = hourlyTemperature.slice(0, 24);
  if (today.length === 0) return undefined;
  return { low: Math.min(...today), high: Math.max(...today) };
}
