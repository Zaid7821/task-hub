import type { ReactNode } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface AdminColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  label: string;
  columns: AdminColumn<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  emptyTitle: string;
}

/** Read-only table with the standard loading / error / empty states. */
export function AdminTable<T>({
  label,
  columns,
  rows,
  rowKey,
  isPending,
  error,
  onRetry,
  emptyTitle,
}: AdminTableProps<T>) {
  if (isPending) {
    return (
      <div
        className="space-y-2 rounded-xl border p-4"
        aria-busy="true"
        aria-label={`Loading ${label}`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (error)
    return <ErrorState title={`Could not load ${label}`} error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[640px]" aria-label={label}>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((c) => (
                <TableCell key={c.header} className={c.className}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
