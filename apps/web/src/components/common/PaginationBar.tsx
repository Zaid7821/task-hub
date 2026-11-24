import type { PaginationMeta } from '@aionos/shared';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationBarProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Dims the controls while the next page loads. */
  isFetching?: boolean;
}

export function PaginationBar({ meta, onPageChange, isFetching = false }: PaginationBarProps) {
  if (meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span aria-live="polite">
        Showing {from}–{to} of {meta.total}
      </span>
      {meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={meta.page <= 1 || isFetching}
          >
            <ChevronLeftIcon /> Previous
          </Button>
          <span className="tabular-nums">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={meta.page >= meta.totalPages || isFetching}
          >
            Next <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
