import type { IsoDateTime, PaginationQuery, UserSummary } from './common.js';

export const AuditAction = {
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_ARCHIVED: 'PROJECT_ARCHIVED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  TASK_DELETED: 'TASK_DELETED',
  TIMESHEET_APPROVED: 'TIMESHEET_APPROVED',
  TIMESHEET_REJECTED: 'TIMESHEET_REJECTED',
  DIRECTORY_SYNC_COMPLETED: 'DIRECTORY_SYNC_COMPLETED',
  DIRECTORY_SYNC_FAILED: 'DIRECTORY_SYNC_FAILED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** GET /audit-logs (SUPER_ADMIN, newest first) */
export interface AuditLogDto {
  id: string;
  actor: UserSummary | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: IsoDateTime;
}

export interface AuditLogListQuery extends PaginationQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
}
