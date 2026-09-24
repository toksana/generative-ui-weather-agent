import { Card, CardContent } from '@/components/ui/card';
import type { GuardReason } from '@/lib/types';

const MESSAGE: Record<GuardReason, string> = {
  input_too_long: 'That message is too long — keep it under 500 characters.',
  too_many_turns: "This conversation has gotten long — start a new one to keep chatting.",
  rate_limited: "You've hit the limit for this demo — try again tomorrow.",
  budget_exceeded: 'This demo has hit its daily budget — please check back tomorrow.',
};

function isGuardReason(value: string): value is GuardReason {
  return value in MESSAGE;
}

export function parseGuardReason(error: Error): GuardReason | null {
  try {
    const body: unknown = JSON.parse(error.message);
    const reason = (body as { reason?: unknown } | null)?.reason;
    return typeof reason === 'string' && isGuardReason(reason) ? reason : null;
  } catch {
    return null;
  }
}

export function RateLimitNotice({ reason }: { reason: GuardReason }) {
  return (
    <Card className="w-full max-w-md border border-destructive/30 bg-destructive/5">
      <CardContent>
        <p className="text-base text-destructive md:text-lg">{MESSAGE[reason]}</p>
      </CardContent>
    </Card>
  );
}
