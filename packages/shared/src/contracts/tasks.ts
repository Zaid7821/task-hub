import type { TaskPriority, TaskStatus, TaskType } from '../enums.js';
import type { LabelDto } from './collaboration.js';
import type {
  IsoDate,
  IsoDateTime,
  PaginationQuery,
  SortDirection,
  UserSummary,
} from './common.js';

export interface ProjectRef {
  id: string;
  key: string;
  name: string;
}

/** GET /tasks (items), GET /tasks/by-key/:key, GET /projects/:id/board, POST/PATCH responses */
export interface TaskDto {
  id: string;
  /** Display key, e.g. "HRP-12". */
  key: string;
  taskNumber: number;
  project: ProjectRef;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: UserSummary | null;
  reporter: UserSummary;
  estimatePoints: number | null;
  estimateHours: number | null;
  dueDate: IsoDate | null;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  position: number;
  loggedHours: number;
  commentCount: number;
  labels: LabelDto[];
  /** Checklist progress, e.g. 2 of 5 done. `total` is 0 when the task has no checklist. */
  checklist: { done: number; total: number };
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type TaskSortField =
  'taskNumber' | 'title' | 'status' | 'priority' | 'dueDate' | 'updatedAt';

/** GET /tasks */
export interface TaskListQuery extends PaginationQuery {
  projectId?: string;
  /** A user id, "me" for the current user, or "none" for unassigned tasks. */
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  /** Tasks carrying this label. */
  labelId?: string;
  search?: string;
  /** Inclusive upper bound on dueDate. */
  dueBefore?: IsoDate;
  overdue?: boolean;
  sort?: TaskSortField;
  order?: SortDirection;
}

/** GET /projects/:id/board: all tasks of a project grouped by status, each column sorted by position. */
export type BoardDto = Record<TaskStatus, TaskDto[]>;

/** POST /projects/:id/tasks */
export interface CreateTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  assigneeId?: string | null;
  estimatePoints?: number | null;
  estimateHours?: number | null;
  dueDate?: IsoDate | null;
  labelIds?: string[];
}

/** PATCH /tasks/:id (general field edits; status and assignee have dedicated endpoints). */
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  estimatePoints?: number | null;
  estimateHours?: number | null;
  dueDate?: IsoDate | null;
}

/** PATCH /tasks/:id/status. `position` places the task within the target column. */
export interface ChangeTaskStatusInput {
  status: TaskStatus;
  position?: number;
}

/** PATCH /tasks/:id/assignee */
export interface ReassignTaskInput {
  assigneeId: string | null;
}

export const TaskActivityAction = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  MOVED: 'MOVED',
} as const;
export type TaskActivityAction = (typeof TaskActivityAction)[keyof typeof TaskActivityAction];

/** GET /tasks/:id/activity (items, newest first) */
export interface TaskActivityDto {
  id: string;
  taskId: string;
  actor: UserSummary;
  action: TaskActivityAction;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: IsoDateTime;
}

/** GET /tasks/:id/comments (items, oldest first) */
export interface CommentDto {
  id: string;
  taskId: string;
  author: UserSummary;
  /** Plain text; mentions are encoded as `<@userId>` and resolved via `mentions`. */
  body: string;
  mentions: UserSummary[];
  editedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

/** POST /tasks/:id/comments, PATCH /comments/:id. Mention someone with `<@userId>` in the body. */
export interface CommentInput {
  body: string;
}

/** Mention token format inside comment bodies, e.g. "Thanks <@0193…>!" */
export const MENTION_PATTERN = /<@([0-9a-f-]{36})>/gi;

/** GET /tasks/:id/time-logs (items, newest workDate first) */
export interface TimeLogDto {
  id: string;
  taskId: string;
  user: UserSummary;
  hours: number;
  workDate: IsoDate;
  note: string | null;
  createdAt: IsoDateTime;
}

/** POST /tasks/:id/time-logs */
export interface CreateTimeLogInput {
  hours: number;
  workDate: IsoDate;
  note?: string;
}
