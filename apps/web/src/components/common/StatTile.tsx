import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
}

/** Headline number card. The value is plain text ink; the icon carries the accent. */
export function StatTile({ label, value, hint, icon: Icon }: StatTileProps) {
  return (
    <Card className="gap-1 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function StatTileSkeleton() {
  return (
    <Card className="gap-2 p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}
