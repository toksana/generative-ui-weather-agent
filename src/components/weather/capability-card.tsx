import { Badge } from '@/components/ui/badge';
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
        <CardTitle className="flex flex-wrap items-center gap-2">
          I can&apos;t provide <Badge variant="warning">{requested}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Try instead:</p>
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
