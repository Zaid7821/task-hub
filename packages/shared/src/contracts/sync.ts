import type { IsoDateTime, UserSummary } from './common.js';

export type DirectorySyncTrigger = 'SCHEDULED' | 'MANUAL';
export type DirectorySyncOutcome = 'SUCCEEDED' | 'FAILED';

/** A Graph account the sync did not apply, with the reason (shown to admins). */
export interface DirectorySyncSkip {
  email: string;
  reason: string;
}

/** One run of the Microsoft Graph directory sync. POST /admin/directory-sync response. */
export interface DirectorySyncRunDto {
  trigger: DirectorySyncTrigger;
  outcome: DirectorySyncOutcome;
  startedAt: IsoDateTime;
  finishedAt: IsoDateTime;
  /** Admin who pressed "Sync now"; null for scheduled runs. */
  triggeredBy: UserSummary | null;
  /** Member accounts read from Graph. */
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  reactivated: number;
  departmentsCreated: number;
  /** Accounts skipped, e.g. an email already used by another identity (first 50). */
  skipped: DirectorySyncSkip[];
  skippedCount: number;
  /** Set when outcome is FAILED. */
  error: string | null;
}

/** GET /admin/directory-sync (SUPER_ADMIN) */
export interface DirectorySyncStatusDto {
  /** GRAPH_SYNC_ENABLED and credentials are set. */
  configured: boolean;
  /** Hours between scheduled runs; 0 = manual only. */
  intervalHours: number;
  running: boolean;
  lastRun: DirectorySyncRunDto | null;
  nextRunAt: IsoDateTime | null;
}

// POST /admin/directory-sync has no body: it runs a sync now and returns DirectorySyncRunDto.
