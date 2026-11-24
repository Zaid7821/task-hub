import type { IsoDate } from './common.js';

/** GET /dashboard/me */
export interface MyStatsDto {
  /** Inclusive range the stats cover. */
  from: IsoDate;
  to: IsoDate;
  tasksDone: number;
  pointsDelivered: number;
  hoursLogged: number;
  /** Share of completed tasks finished on or before their due date, 0-100. Null if none had a due date. */
  onTimeRate: number | null;
  /** One entry per ISO week in the range. */
  weekly: { weekStart: IsoDate; tasksDone: number; hoursLogged: number }[];
}
