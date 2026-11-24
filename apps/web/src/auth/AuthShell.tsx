import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/common/BrandLogo';

/** Centered card layout shared by the login pages. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className={wide ? 'w-full max-w-4xl' : 'w-full max-w-sm'}>
        <div className="mb-8 flex flex-col items-center gap-2">
          <BrandLogo className="h-10" />
          <span className="text-sm font-medium tracking-wide text-muted-foreground">
            Work Tracker
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
