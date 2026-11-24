import type { LabelDto } from '@aionos/shared';
import { cn } from '@/lib/utils';
import { LABEL_DOT } from './tones';

/** Label chip: coloured dot + regular text colour, so it stays readable in both themes. */
export function LabelBadge({
  label,
  className,
}: {
  label: Pick<LabelDto, 'name' | 'color'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-32 items-center gap-1 rounded-full border bg-background px-1.5 py-px text-[11px] leading-4 text-foreground',
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', LABEL_DOT[label.color])} aria-hidden />
      <span className="truncate">{label.name}</span>
    </span>
  );
}

export function LabelList({
  labels,
  max = 3,
}: {
  labels: Pick<LabelDto, 'id' | 'name' | 'color'>[];
  max?: number;
}) {
  if (labels.length === 0) return null;
  const shown = labels.slice(0, max);
  const hidden = labels.length - shown.length;
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1"
      aria-label={`Labels: ${labels.map((l) => l.name).join(', ')}`}
    >
      {shown.map((l) => (
        <LabelBadge key={l.id} label={l} />
      ))}
      {hidden > 0 && <span className="text-[11px] text-muted-foreground">+{hidden}</span>}
    </span>
  );
}
