import { ConstructionIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

/** Temporary placeholder for screens built in later steps. */
export function ComingSoon({ what }: { what: string }) {
  return (
    <EmptyState
      icon={ConstructionIcon}
      title={`${what} is coming soon`}
      description="This screen is part of a later build step."
    />
  );
}
