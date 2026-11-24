import type { IsoDate, IsoDateTime, TaskStatus } from '@aionos/shared';
import { addDays, format, formatDistanceToNow, parseISO } from 'date-fns';

/** Today's calendar date in the user's timezone, "YYYY-MM-DD". */
export function todayIso(): IsoDate {
  return format(new Date(), 'yyyy-MM-dd');
}

/** "2026-11-20" -> "20 Nov 2026" (or "20 Nov" when `short`). Date-only values are read as local dates. */
export function formatDate(date: IsoDate | null | undefined, short = false): string {
  if (!date) return '—';
  return format(parseISO(date), short ? 'd MMM' : 'd MMM yyyy');
}

export function formatDateTime(value: IsoDateTime): string {
  return format(parseISO(value), 'd MMM yyyy, HH:mm');
}

export function timeAgo(value: IsoDateTime): string {
  return formatDistanceToNow(parseISO(value), { addSuffix: true });
}

/** Monday ("YYYY-MM-DD") of the week containing `date` (defaults to today). */
export function mondayOf(date: IsoDate = todayIso()): IsoDate {
  const d = parseISO(date);
  return format(addDays(d, -((d.getDay() + 6) % 7)), 'yyyy-MM-dd');
}

export function addDaysIso(date: IsoDate, days: number): IsoDate {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

/** "16 – 22 Nov 2026" for the week starting `weekStart`. */
export function formatWeekRange(weekStart: IsoDate): string {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  return `${format(start, sameMonth ? 'd' : 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
}

export function isOverdue(task: { dueDate: IsoDate | null; status: TaskStatus }): boolean {
  return task.status !== 'DONE' && task.dueDate !== null && task.dueDate < todayIso();
}
