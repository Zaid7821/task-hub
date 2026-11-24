import type { SortDirection } from '@aionos/shared';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SortableTableHeadProps<F extends string> {
  field: F;
  sort: F;
  order: SortDirection;
  onSort: (field: F, order: SortDirection) => void;
  children: ReactNode;
  className?: string;
}

/** Column header that toggles asc/desc on click; first click on a new column sorts ascending. */
export function SortableTableHead<F extends string>({
  field,
  sort,
  order,
  onSort,
  children,
  className,
}: SortableTableHeadProps<F>) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDownIcon : order === 'asc' ? ArrowUpIcon : ArrowDownIcon;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={cn(
          '-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent',
          active && 'text-foreground',
        )}
        onClick={() => onSort(field, active && order === 'asc' ? 'desc' : 'asc')}
      >
        {children}
        <Icon className={cn('size-3.5', !active && 'text-muted-foreground/60')} aria-hidden />
      </button>
    </TableHead>
  );
}
