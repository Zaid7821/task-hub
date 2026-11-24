import logoDark from '@/assets/brand/aionos-logo-dark.png';
import logo from '@/assets/brand/aionos-logo.png';
import { cn } from '@/lib/utils';

/**
 * AIonOS wordmark. Two transparent variants: navy lettering for light theme, white lettering for
 * dark theme (both keep the blue dot). Height is set by the caller via `className` (e.g. "h-6").
 * TODO(phase-x): swap the PNGs for the official SVG logo when brand assets arrive (sharper on HiDPI).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      <img src={logo} alt="AIonOS" className={cn('w-auto dark:hidden', className)} />
      <img src={logoDark} alt="AIonOS" className={cn('hidden w-auto dark:block', className)} />
    </>
  );
}
