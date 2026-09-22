import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExplainCapabilityInput } from '@/lib/weather/schemas';

interface CapabilityCardProps extends ExplainCapabilityInput {
  onSelectPrompt?: (prompt: string) => void;
}

export function CapabilityCard({ requested, nearest, onSelectPrompt }: CapabilityCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Can&apos;t help with that</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base text-foreground/80 md:text-lg">{requested}</p>
        <div className="flex flex-wrap gap-2">
          {nearest.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectPrompt?.(action.prompt)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
