import type { TaskActivityAction } from '@aionos/shared';
import type { Db } from './task.mapper.js';

export interface ActivityEntry {
  taskId: string;
  actorId: string;
  action: TaskActivityAction;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}

/** Writes TaskActivity rows. Always pass the transaction client of the change being recorded. */
export async function logActivity(tx: Db, ...entries: ActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await tx.taskActivity.createMany({
    data: entries.map((e) => ({
      taskId: e.taskId,
      actorId: e.actorId,
      action: e.action,
      field: e.field ?? null,
      oldValue: e.oldValue ?? null,
      newValue: e.newValue ?? null,
    })),
  });
}

/** Activity values are stored as text (dates as YYYY-MM-DD, numbers as plain digits). */
export const asText = (v: string | number | null | undefined): string | null =>
  v === null || v === undefined ? null : String(v);
