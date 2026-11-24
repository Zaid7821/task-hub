import { Loader2Icon } from 'lucide-react';

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2Icon className="size-6 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
