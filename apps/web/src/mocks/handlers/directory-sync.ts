import { SystemRole, type DirectorySyncRunDto, type DirectorySyncStatusDto } from '@aionos/shared';
import { HttpResponse, delay, http } from 'msw';
import { db, nowIso } from '../db';
import { apiError, apiPath, currentUser } from '../http';
import { toUserSummary } from '../serializers';

const INTERVAL_HOURS = 24;
// Kept in memory only: the real API reads the last run back from the audit log.
let lastRun: DirectorySyncRunDto | null = null;

function requireSuperAdmin(request: Request) {
  const user = currentUser(request);
  if (user.systemRole !== SystemRole.SUPER_ADMIN) {
    throw apiError(request, 403, 'Your role does not allow this action');
  }
  return user;
}

export const directorySyncHandlers = [
  http.get(apiPath('/admin/directory-sync'), ({ request }) => {
    requireSuperAdmin(request);
    const status: DirectorySyncStatusDto = {
      configured: true,
      intervalHours: INTERVAL_HOURS,
      running: false,
      lastRun,
      nextRunAt: lastRun
        ? new Date(Date.parse(lastRun.startedAt) + INTERVAL_HOURS * 3_600_000).toISOString()
        : nowIso(),
    };
    return HttpResponse.json(status);
  }),

  // Simulates a run with no directory changes (mock users stand in for Entra accounts).
  http.post(apiPath('/admin/directory-sync'), async ({ request }) => {
    const user = requireSuperAdmin(request);
    const startedAt = nowIso();
    await delay(800);
    const active = db.users.filter((u) => u.isActive);
    for (const u of active) u.lastSyncedAt = nowIso();
    lastRun = {
      trigger: 'MANUAL',
      outcome: 'SUCCEEDED',
      startedAt,
      finishedAt: nowIso(),
      triggeredBy: toUserSummary(user),
      fetched: active.length,
      created: 0,
      updated: 0,
      unchanged: active.length,
      deactivated: 0,
      reactivated: 0,
      departmentsCreated: 0,
      skipped: [],
      skippedCount: 0,
      error: null,
    };
    return HttpResponse.json(lastRun);
  }),
];
