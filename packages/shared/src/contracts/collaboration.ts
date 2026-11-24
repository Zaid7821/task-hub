import type { LabelColor, NotificationType } from '../enums.js';
import type { IsoDate, IsoDateTime, PaginationQuery, UserSummary } from './common.js';

// ─── Labels ────────────────────────────────────────────────────────────────

/** GET /projects/:id/labels (items), embedded in TaskDto.labels */
export interface LabelDto {
  id: string;
  projectId: string;
  name: string;
  color: LabelColor;
}

/** POST /projects/:id/labels */
export interface CreateLabelInput {
  name: string;
  color: LabelColor;
}

/** PATCH /labels/:id */
export interface UpdateLabelInput {
  name?: string;
  color?: LabelColor;
}

/** PUT /tasks/:id/labels: replaces the task's labels (all must belong to the task's project). */
export interface SetTaskLabelsInput {
  labelIds: string[];
}

// ─── Checklists ────────────────────────────────────────────────────────────

/** GET /tasks/:id/checklist (array, sorted by position) */
export interface ChecklistItemDto {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  doneAt: IsoDateTime | null;
  doneBy: UserSummary | null;
  position: number;
}

/** POST /tasks/:id/checklist (appended at the end) */
export interface CreateChecklistItemInput {
  title: string;
}

/** PATCH /checklist-items/:id */
export interface UpdateChecklistItemInput {
  title?: string;
  isDone?: boolean;
  position?: number;
}

// ─── Saved views ───────────────────────────────────────────────────────────

/** GET /saved-views (array, the caller's own), POST response */
export interface SavedViewDto {
  id: string;
  name: string;
  /** App path, e.g. "/my-work" or "/projects/WTR/list". */
  path: string;
  /** URL query without "?", e.g. "status=IN_REVIEW&priority=HIGH". */
  query: string;
  createdAt: IsoDateTime;
}

/** POST /saved-views */
export interface CreateSavedViewInput {
  name: string;
  path: string;
  query: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface NotificationTaskRef {
  id: string;
  key: string;
  title: string;
  projectKey: string;
}

export interface NotificationTimesheetRef {
  id: string;
  weekStart: IsoDate;
  owner: UserSummary;
}

/** GET /notifications (items, newest first) */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  actor: UserSummary | null;
  task: NotificationTaskRef | null;
  timesheet: NotificationTimesheetRef | null;
  /** STATUS_CHANGED: { from, to }; MENTIONED/COMMENT_ADDED: { excerpt }; TIMESHEET_REJECTED: { note }. */
  data: Record<string, string> | null;
  readAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

/** GET /notifications */
export interface NotificationListQuery extends PaginationQuery {
  unreadOnly?: boolean;
}

/** GET /notifications/unread-count */
export interface UnreadCountDto {
  count: number;
}

// POST /notifications/read-all and PATCH /notifications/:id/read have no body (204 / NotificationDto).
