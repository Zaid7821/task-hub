import type { MyStatsDto } from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { isoDay } from '../db';
import { apiPath, currentUser } from '../http';

const WEEKS = 8;

/** Small deterministic PRNG so each user sees stable sample numbers across reloads. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Days from today back to this week's Monday. */
function daysSinceMonday(): number {
  return (new Date().getUTCDay() + 6) % 7;
}

export const dashboardHandlers = [
  // Placeholder: illustrative sample data, not derived from the mock tasks.
  // TODO(phase-x): the real API aggregates TimeLog/Task rows for the current user.
  http.get(apiPath('/dashboard/me'), ({ request }) => {
    const user = currentUser(request);
    const random = seededRandom(user.email);
    const thisMonday = -daysSinceMonday();

    const weekly = Array.from({ length: WEEKS }, (_, i) => {
      const weekStart = isoDay(thisMonday - (WEEKS - 1 - i) * 7);
      const isCurrentWeek = i === WEEKS - 1;
      const hours = Math.round((isCurrentWeek ? 12 : 22) + random() * 16);
      return { weekStart, tasksDone: Math.round(random() * 5), hoursLogged: hours };
    });

    const tasksDone = weekly.reduce((sum, w) => sum + w.tasksDone, 0);
    const stats: MyStatsDto = {
      from: weekly[0]?.weekStart ?? isoDay(0),
      to: isoDay(0),
      tasksDone,
      pointsDelivered: Math.round(tasksDone * (2 + random() * 3)),
      hoursLogged: weekly.reduce((sum, w) => sum + w.hoursLogged, 0),
      onTimeRate: tasksDone === 0 ? null : Math.round(70 + random() * 28),
      weekly,
    };
    return HttpResponse.json(stats);
  }),
];
