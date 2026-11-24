import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  label = 'Progress',
  showValue = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full', clamped === 100 ? 'bg-success' : 'bg-primary')}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
