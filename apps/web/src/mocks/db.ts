// Mock database. Rows mirror the Prisma models (not the API DTOs); handlers convert rows to DTOs
// via serializers.ts, the same way the real API will. Saved to localStorage after every write
// (see persistence.ts) so it survives reloads; "Reset demo data" in the user menu clears it.
import {
  NotificationType,
  ProjectStatus,
  TaskActivityAction,
  TaskStatus,
  TimesheetStatus,
  type LabelColor,
  type ProjectMemberRole,
  type ProjectVisibility,
  type SystemRole,
  type TaskPriority,
  type TaskType,
} from '@aionos/shared';
import {
  CHECKLIST_LINES,
  COMMENT_LINES,
  DEPARTMENTS,
  HOURS_CYCLE,
  LABELS,
  POINTS_CYCLE,
  PRIORITY_CYCLE,
  PROJECTS,
  STATUS_CYCLE,
  TEAMS,
  TIMESHEETS,
  USERS,
  seedEmail,
} from './data/seed-data';
import { loadMockDb, saveMockDb } from './persistence';

export interface DepartmentRow {
  id: string;
  name: string;
  headId: string | null;
  parentDepartmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRow {
  id: string;
  name: string;
  departmentId: string;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRow {
  id: string;
  entraObjectId: string;
  email: string;
  displayName: string;
  jobTitle: string | null;
  employeeCode: string | null;
  departmentId: string | null;
  teamId: string | null;
  managerId: string | null;
  systemRole: SystemRole;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ownerId: string;
  departmentId: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  startDate: string | null;
  endDate: string | null;
  taskCounter: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRow {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: string;
}

export interface TaskRow {
  id: string;
  projectId: string;
  taskNumber: number;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  estimatePoints: number | null;
  estimateHours: number | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLogRow {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  workDate: string;
  note: string | null;
  createdAt: string;
}

export interface CommentRow {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
}

export interface ActivityRow {
  id: string;
  taskId: string;
  actorId: string;
  action: TaskActivityAction;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface LabelRow {
  id: string;
  projectId: string;
  name: string;
  color: LabelColor;
  createdAt: string;
}

export interface TaskLabelRow {
  taskId: string;
  labelId: string;
}

export interface ChecklistItemRow {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  doneAt: string | null;
  doneById: string | null;
  position: number;
  createdAt: string;
}

export interface SavedViewRow {
  id: string;
  userId: string;
  name: string;
  path: string;
  query: string;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string | null;
  taskId: string | null;
  timesheetId: string | null;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

export interface TimesheetRow {
  id: string;
  userId: string;
  weekStart: string;
  status: TimesheetStatus;
  submittedAt: string | null;
  approverId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface MockDb {
  departments: DepartmentRow[];
  teams: TeamRow[];
  users: UserRow[];
  projects: ProjectRow[];
  members: MemberRow[];
  tasks: TaskRow[];
  timeLogs: TimeLogRow[];
  comments: CommentRow[];
  activities: ActivityRow[];
  labels: LabelRow[];
  taskLabels: TaskLabelRow[];
  checklist: ChecklistItemRow[];
  savedViews: SavedViewRow[];
  notifications: NotificationRow[];
  timesheets: TimesheetRow[];
}

export const newId = (): string => crypto.randomUUID();
export const nowIso = (): string => new Date().toISOString();

/** "YYYY-MM-DD" for today + `days` (UTC), matching the seed's @db.Date values. */
export function isoDay(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday (YYYY-MM-DD, UTC) of the week containing `date`. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** `date` + `days` as YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoTimestampDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

function createDb(): MockDb {
  const created = isoTimestampDaysAgo(60);
  const db: MockDb = {
    departments: [],
    teams: [],
    users: [],
    projects: [],
    members: [],
    tasks: [],
    timeLogs: [],
    comments: [],
    activities: [],
    labels: [],
    taskLabels: [],
    checklist: [],
    savedViews: [],
    notifications: [],
    timesheets: [],
  };

  const deptIds = new Map<string, string>();
  const teamIds = new Map<string, string>();
  const userIds = new Map<string, string>();
  const uid = (key: string): string => {
    const id = userIds.get(key);
    if (!id) throw new Error(`Mock seed references unknown user "${key}"`);
    return id;
  };

  for (const d of DEPARTMENTS) {
    const id = newId();
    deptIds.set(d.key, id);
    db.departments.push({
      id,
      name: d.name,
      headId: null,
      parentDepartmentId: null,
      createdAt: created,
      updatedAt: created,
    });
  }
  for (const t of TEAMS) {
    const id = newId();
    teamIds.set(t.key, id);
    db.teams.push({
      id,
      name: t.name,
      departmentId: deptIds.get(t.dept) ?? '',
      leadId: null,
      createdAt: created,
      updatedAt: created,
    });
  }
  for (const [i, u] of USERS.entries()) {
    const id = newId();
    userIds.set(u.key, id);
    db.users.push({
      id,
      entraObjectId: `00000000-0000-4000-8000-${(i + 1).toString().padStart(12, '0')}`,
      email: seedEmail(u.key),
      displayName: u.name,
      jobTitle: u.title,
      employeeCode: `AIO-${1001 + i}`,
      departmentId: deptIds.get(u.dept) ?? null,
      teamId: u.team ? (teamIds.get(u.team) ?? null) : null,
      managerId: u.manager ? uid(u.manager) : null,
      systemRole: u.role,
      isActive: true,
      lastSyncedAt: null,
      createdAt: created,
      updatedAt: created,
    });
  }
  for (const d of DEPARTMENTS) {
    const row = db.departments.find((x) => x.id === deptIds.get(d.key));
    if (row) row.headId = uid(d.head);
  }
  for (const t of TEAMS) {
    const row = db.teams.find((x) => x.id === teamIds.get(t.key));
    if (row && t.lead) row.leadId = uid(t.lead);
  }

  const assignedTasks = new Map<string, string[]>();

  for (const p of PROJECTS) {
    const projectId = newId();
    db.projects.push({
      id: projectId,
      key: p.key,
      name: p.name,
      description: p.description,
      ownerId: uid(p.owner),
      departmentId: deptIds.get(p.dept) ?? '',
      status: ProjectStatus.ACTIVE,
      visibility: p.visibility,
      startDate: isoDay(-45),
      endDate: isoDay(90),
      taskCounter: p.tasks.length,
      createdAt: created,
      updatedAt: created,
    });
    for (const m of p.members) {
      db.members.push({ projectId, userId: uid(m.user), role: m.role, createdAt: created });
    }
    const labelIds = (LABELS[p.key] ?? []).map(([name, color]) => {
      const id = newId();
      db.labels.push({ id, projectId, name, color, createdAt: created });
      return id;
    });

    const assignees = p.members.filter((m) => m.role !== 'VIEWER').map((m) => uid(m.user));
    const reporterId = uid(p.owner);
    const positionInColumn = new Map<TaskStatus, number>();

    for (const [i, [title, type]] of p.tasks.entries()) {
      const status = pick(STATUS_CYCLE, i);
      const assigneeId = i % 7 === 6 ? null : pick(assignees, i);
      const points = pick(POINTS_CYCLE, i);
      const position = (positionInColumn.get(status) ?? 0) + 1000;
      positionInColumn.set(status, position);
      const started = status !== TaskStatus.TODO;
      const taskId = newId();
      const taskCreated = isoTimestampDaysAgo(30 - i);
      const actorId = assigneeId ?? reporterId;

      db.tasks.push({
        id: taskId,
        projectId,
        taskNumber: i + 1,
        title,
        description: `${title}. Seeded example task for local development.`,
        type,
        status,
        priority: pick(PRIORITY_CYCLE, i),
        assigneeId,
        reporterId,
        estimatePoints: points,
        estimateHours: i % 2 === 0 ? points * 2 : null,
        dueDate: isoDay(-6 + i * 4),
        startedAt: started ? `${isoDay(-14 + i)}T09:00:00.000Z` : null,
        completedAt: status === TaskStatus.DONE ? `${isoDay(-2)}T17:00:00.000Z` : null,
        position,
        createdAt: taskCreated,
        updatedAt: taskCreated,
      });

      const activity = (a: Omit<ActivityRow, 'id' | 'taskId' | 'createdAt'>, at: string) =>
        db.activities.push({ id: newId(), taskId, createdAt: at, ...a });
      activity(
        {
          actorId: reporterId,
          action: TaskActivityAction.CREATED,
          field: null,
          oldValue: null,
          newValue: null,
        },
        taskCreated,
      );
      if (assigneeId) {
        activity(
          {
            actorId: reporterId,
            action: TaskActivityAction.ASSIGNED,
            field: 'assigneeId',
            oldValue: null,
            newValue: assigneeId,
          },
          taskCreated,
        );
      }
      if (started) {
        activity(
          {
            actorId,
            action: TaskActivityAction.STATUS_CHANGED,
            field: 'status',
            oldValue: TaskStatus.TODO,
            newValue: status,
          },
          `${isoDay(-14 + i)}T09:00:00.000Z`,
        );
      }

      if (started && assigneeId) {
        const logs = status === TaskStatus.DONE ? 3 : status === TaskStatus.IN_REVIEW ? 2 : 1;
        for (let k = 0; k < logs; k++) {
          db.timeLogs.push({
            id: newId(),
            taskId,
            userId: assigneeId,
            hours: pick(HOURS_CYCLE, i + k),
            workDate: isoDay(-(k + 1)),
            note: k === 0 ? 'Implementation work' : 'Follow-up and review fixes',
            createdAt: isoTimestampDaysAgo(k + 1),
          });
        }
      }

      if (i % 3 === 0) {
        const authors = assigneeId ? [reporterId, assigneeId] : [reporterId];
        authors.forEach((authorId, k) => {
          db.comments.push({
            id: newId(),
            taskId,
            authorId,
            body: pick(COMMENT_LINES, i + k),
            editedAt: null,
            createdAt: isoTimestampDaysAgo(5 - k),
          });
        });
      }

      for (const labelId of [
        i % 3 === 0 ? labelIds[0] : undefined,
        i % 4 === 1 ? labelIds[1] : undefined,
        i % 5 === 2 ? labelIds[2] : undefined,
      ]) {
        if (labelId) db.taskLabels.push({ taskId, labelId });
      }

      if (status === TaskStatus.IN_PROGRESS || status === TaskStatus.IN_REVIEW) {
        const doneCount = status === TaskStatus.IN_REVIEW ? 2 : 1;
        CHECKLIST_LINES.forEach((line, k) => {
          db.checklist.push({
            id: newId(),
            taskId,
            title: line,
            isDone: k < doneCount,
            doneAt: k < doneCount ? isoTimestampDaysAgo(1) : null,
            doneById: k < doneCount ? actorId : null,
            position: (k + 1) * 1000,
            createdAt: taskCreated,
          });
        });
      }

      if (assigneeId) {
        assignedTasks.set(assigneeId, [...(assignedTasks.get(assigneeId) ?? []), taskId]);
        if (assigneeId !== reporterId) {
          db.notifications.push({
            id: newId(),
            userId: assigneeId,
            type: NotificationType.TASK_ASSIGNED,
            actorId: reporterId,
            taskId,
            timesheetId: null,
            data: null,
            readAt: i % 2 === 0 ? isoTimestampDaysAgo(1) : null,
            createdAt: taskCreated,
          });
        }
      }
    }
  }

  const lastMonday = addDays(mondayOf(isoDay(0)), -7);
  for (const sheet of TIMESHEETS) {
    const userId = uid(sheet.user);
    const tasks = (assignedTasks.get(userId) ?? []).slice(0, 2);
    const firstTask = tasks[0];
    if (!firstTask) continue;
    sheet.hours.forEach((hours, day) => {
      db.timeLogs.push({
        id: newId(),
        taskId: tasks[day % tasks.length] ?? firstTask,
        userId,
        hours,
        workDate: addDays(lastMonday, day),
        note: 'Planned work',
        createdAt: isoTimestampDaysAgo(8 - day),
      });
    });
    const approved = sheet.status === TimesheetStatus.APPROVED;
    const sheetId = newId();
    db.timesheets.push({
      id: sheetId,
      userId,
      weekStart: lastMonday,
      status: sheet.status,
      submittedAt: isoTimestampDaysAgo(3),
      approverId: uid(sheet.approver),
      decidedAt: approved ? isoTimestampDaysAgo(2) : null,
      decisionNote: null,
      createdAt: isoTimestampDaysAgo(3),
    });
    db.notifications.push({
      id: newId(),
      userId: approved ? userId : uid(sheet.approver),
      type: approved ? NotificationType.TIMESHEET_APPROVED : NotificationType.TIMESHEET_SUBMITTED,
      actorId: approved ? uid(sheet.approver) : userId,
      taskId: null,
      timesheetId: sheetId,
      data: null,
      readAt: null,
      createdAt: isoTimestampDaysAgo(approved ? 2 : 3),
    });
  }

  return db;
}

const TABLES: (keyof MockDb)[] = [
  'departments',
  'teams',
  'users',
  'projects',
  'members',
  'tasks',
  'timeLogs',
  'comments',
  'activities',
  'labels',
  'taskLabels',
  'checklist',
  'savedViews',
  'notifications',
  'timesheets',
];

function isMockDb(value: unknown): value is MockDb {
  return (
    typeof value === 'object' &&
    value !== null &&
    TABLES.every((t) => Array.isArray((value as Record<string, unknown>)[t]))
  );
}

/** Saved data from a previous session if present, otherwise fresh seed data. */
export const db: MockDb = loadMockDb(isMockDb) ?? createDb();

/** Called after every mocked write so changes survive a page reload. */
export function persistDb(): void {
  saveMockDb(db);
}
