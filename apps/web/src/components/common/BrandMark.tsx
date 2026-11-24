import { cn } from '@/lib/utils';

/** Square brand mark for tight spaces (collapsed sidebar). Use <BrandLogo> where width allows. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-lg leading-none font-bold text-primary-foreground',
        className,
      )}
    >
      a
    </div>
  );
}
