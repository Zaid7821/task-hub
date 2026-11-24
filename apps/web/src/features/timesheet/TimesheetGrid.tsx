import type { TimesheetRowDto, TimesheetWeekDto } from '@aionos/shared';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { addDaysIso, todayIso } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { taskPath } from '@/features/tasks/task-paths';
import { DayCellEditor } from './DayCellEditor';

const fmt = (h: number) =>
  h === 0 ? '–' : Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0$/, '');

interface TimesheetGridProps {
  week: TimesheetWeekDto;
  /** Owner view of an unlocked week: cells open an editor to add/remove entries. */
  editable: boolean;
}

export function TimesheetGrid({ week, editable }: TimesheetGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(week.weekStart, i));
  const today = todayIso();

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[760px]" aria-label={`Timesheet for the week of ${week.weekStart}`}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[34%]">Task</TableHead>
            {days.map((d, i) => (
              <TableHead
                key={d}
                className={cn(
                  'text-center',
                  i >= 5 && 'bg-muted/40',
                  d === today && 'text-primary',
                )}
              >
                <span className="block text-xs font-normal">{format(parseISO(d), 'EEE')}</span>
                <span className="block">{format(parseISO(d), 'd')}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {week.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                No time logged this week. Tasks assigned to you that are in progress or in review
                appear here; you can also log time from any task's Time tab.
              </TableCell>
            </TableRow>
          ) : (
            week.rows.map((row) => (
              <GridRow key={row.task.id} row={row} days={days} today={today} editable={editable} />
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">Daily total</TableCell>
            {week.dailyTotals.map((h, i) => (
              <TableCell
                key={i}
                className={cn(
                  'text-center tabular-nums',
                  i >= 5 && 'bg-muted/40',
                  h > 10 && 'text-warning',
                )}
              >
                {fmt(h)}
              </TableCell>
            ))}
            <TableCell className="text-right font-semibold tabular-nums">
              {week.totalHours} h
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function GridRow({
  row,
  days,
  today,
  editable,
}: {
  row: TimesheetRowDto;
  days: string[];
  today: string;
  editable: boolean;
}) {
  const total = row.hours.reduce((a, b) => a + b, 0);
  return (
    <TableRow>
      <TableCell className="max-w-0">
        <Link
          to={taskPath({ key: row.task.key, project: row.task.project })}
          className="block truncate font-medium hover:underline"
          title={row.task.title}
        >
          <span className="mr-1.5 font-mono text-xs text-muted-foreground">{row.task.key}</span>
          {row.task.title}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">
          {row.task.project.name}
        </span>
      </TableCell>
      {days.map((date, i) => {
        const hours = row.hours[i] ?? 0;
        const isFuture = date > today;
        return (
          <TableCell
            key={date}
            className={cn('p-1 text-center tabular-nums', i >= 5 && 'bg-muted/40')}
          >
            {editable && !isFuture ? (
              <DayCellEditor row={row} date={date} hours={hours} />
            ) : (
              <span
                className={cn(
                  'inline-block min-w-10 py-1.5',
                  hours === 0 && 'text-muted-foreground',
                )}
              >
                {fmt(hours)}
              </span>
            )}
          </TableCell>
        );
      })}
      <TableCell className="text-right font-medium tabular-nums">
        {fmt(Math.round(total * 100) / 100)}
      </TableCell>
    </TableRow>
  );
}
