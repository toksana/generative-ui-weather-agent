import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { ExplainCapabilityInput } from '@/lib/weather/schemas';

import { WidgetErrorBoundary } from './widget-error-boundary';

interface CapabilityCardProps extends ExplainCapabilityInput {
  onSelectPrompt?: (prompt: string) => void;
}

function CapabilityCardBase({ requested, nearest, onSelectPrompt }: CapabilityCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Can&apos;t help with that</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base text-foreground/80 md:text-lg">{requested}</p>
        <div className="flex flex-wrap gap-2">
          {nearest.map((action) => (
            <Chip key={action.label} type="button" onClick={() => onSelectPrompt?.(action.prompt)}>
              {action.label}
            </Chip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CapabilityCard(props: CapabilityCardProps) {
  return (
    <WidgetErrorBoundary query={props.requested}>
      <CapabilityCardBase {...props} />
    </WidgetErrorBoundary>
  );
}
