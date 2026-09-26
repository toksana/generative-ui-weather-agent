import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { FailureReason } from '@/lib/types';

export const REASON_COPY: Record<FailureReason, string> = {
  not_found: "We couldn't find that place.",
  invalid_response: 'The weather service sent back something we could not read.',
  timeout: 'The weather service took too long to respond.',
  upstream_error: 'The weather service is unavailable right now.',
};

interface WeatherFallbackCardProps {
  reason: FailureReason;
  query?: string;
  onRetry?: () => void;
}

export function WeatherFallbackCard({ reason, query, onRetry }: WeatherFallbackCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-1">
        <p className="text-base font-medium text-foreground md:text-lg">
          {query ? `Couldn't get the weather for "${query}".` : 'Something went wrong.'}
        </p>
        <p className="text-base text-muted-foreground md:text-lg">{REASON_COPY[reason]}</p>
        {onRetry && (
          <Chip type="button" onClick={onRetry} className="mt-2">
            Try again
          </Chip>
        )}
      </CardContent>
    </Card>
  );
}
