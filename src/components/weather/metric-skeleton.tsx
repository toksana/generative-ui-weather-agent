import { cn } from '@/lib/utils';

export function MetricSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('animate-pulse rounded-lg bg-muted', className)}
    />
  );
}
