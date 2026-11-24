// Date helpers. Calendar dates (@db.Date) travel as "YYYY-MM-DD" and are stored as UTC midnight.

export function toIsoDate(d: Date): string;
export function toIsoDate(d: Date | null): string | null;
export function toIsoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export function fromIsoDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Latest calendar date a client may call "today". Users' local dates can be up to 14h ahead of
 * UTC (India is 5.5h), so "no future dates" checks allow one day of slack.
 */
export function latestClientToday(): string {
  return addDaysIso(todayIso(), 1);
}

export function addDaysIso(date: string, days: number): string {
  const d = fromIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/** Monday of the week containing `date` (UTC). */
export function mondayOf(date: string): string {
  const d = fromIsoDate(date);
  return addDaysIso(date, -((d.getUTCDay() + 6) % 7));
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;
