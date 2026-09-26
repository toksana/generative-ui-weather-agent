import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  progress?: { value: number; max?: number };
  className?: string;
}

export function StatCard({ icon: Icon, iconClassName, label, value, detail, progress, className }: StatCardProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-3', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        <Icon aria-hidden="true" className={cn('text-info', iconClassName)} />
        {label}
      </div>
      <div className="font-mono text-base font-medium text-foreground">{value}</div>
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      {progress && (
        <Progress value={progress.value} max={progress.max} className="mt-0.5">
          <ProgressTrack>
            <ProgressIndicator variant="info" />
          </ProgressTrack>
        </Progress>
      )}
    </div>
  );
}
