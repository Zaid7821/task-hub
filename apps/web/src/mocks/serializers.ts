// Row -> DTO conversion, mirroring what the API services will return.
import {
  MENTION_PATTERN,
  TaskStatus,
  type ChecklistItemDto,
  type LabelDto,
  type NotificationDto,
  type SavedViewDto,
  type CommentDto,
  type DepartmentDto,
  type NamedRef,
  type ProjectDto,
  type ProjectMemberDto,
  type TaskActivityDto,
  type TaskDto,
  type TeamDto,
  type TimeLogDto,
  type UserDto,
  type UserSummary,
} from '@aionos/shared';
import {
  db,
  type ActivityRow,
  type ChecklistItemRow,
  type CommentRow,
  type DepartmentRow,
  type LabelRow,
  type MemberRow,
  type NotificationRow,
  type ProjectRow,
  type SavedViewRow,
  type TaskRow,
  type TeamRow,
  type TimeLogRow,
  type UserRow,
} from './db';

/** Distinct user ids mentioned as `<@id>` in a comment body, in order of appearance. */
export function mentionedUserIds(body: string): string[] {
  return [...new Set([...body.matchAll(MENTION_PATTERN)].map((m) => (m[1] ?? '').toLowerCase()))];
}

export function toLabelDto(l: LabelRow): LabelDto {
  return { id: l.id, projectId: l.projectId, name: l.name, color: l.color };
}

export function toChecklistItemDto(c: ChecklistItemRow): ChecklistItemDto {
  const doneBy = userById(c.doneById);
  return {
    id: c.id,
    taskId: c.taskId,
    title: c.title,
    isDone: c.isDone,
    doneAt: c.doneAt,
    doneBy: doneBy ? toUserSummary(doneBy) : null,
    position: c.position,
  };
}

export function toSavedViewDto(v: SavedViewRow): SavedViewDto {
  return { id: v.id, name: v.name, path: v.path, query: v.query, createdAt: v.createdAt };
}

export function toNotificationDto(n: NotificationRow): NotificationDto {
  const actor = userById(n.actorId);
  const task = n.taskId ? db.tasks.find((t) => t.id === n.taskId) : undefined;
  const project = task ? db.projects.find((p) => p.id === task.projectId) : undefined;
  const sheet = n.timesheetId ? db.timesheets.find((s) => s.id === n.timesheetId) : undefined;
  const owner = sheet ? userById(sheet.userId) : undefined;
  return {
    id: n.id,
    type: n.type,
    actor: actor ? toUserSummary(actor) : null,
    task:
      task && project
        ? {
            id: task.id,
            key: `${project.key}-${task.taskNumber}`,
            title: task.title,
            projectKey: project.key,
          }
        : null,
    timesheet:
      sheet && owner
        ? { id: sheet.id, weekStart: sheet.weekStart, owner: toUserSummary(owner) }
        : null,
    data: n.data,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

export function userById(id: string | null): UserRow | undefined {
  return id ? db.users.find((u) => u.id === id) : undefined;
}

function requireUser(id: string): UserRow {
  const user = userById(id);
  if (!user) throw new Error(`Mock DB integrity: user ${id} missing`);
  return user;
}

export function toUserSummary(u: UserRow): UserSummary {
  return { id: u.id, displayName: u.displayName, email: u.email, jobTitle: u.jobTitle };
}

function departmentRef(id: string | null): NamedRef | null {
  const d = id ? db.departments.find((x) => x.id === id) : undefined;
  return d ? { id: d.id, name: d.name } : null;
}

function teamRef(id: string | null): NamedRef | null {
  const t = id ? db.teams.find((x) => x.id === id) : undefined;
  return t ? { id: t.id, name: t.name } : null;
}

export function toUserDto(u: UserRow): UserDto {
  const manager = userById(u.managerId);
  return {
    ...toUserSummary(u),
    employeeCode: u.employeeCode,
    department: departmentRef(u.departmentId),
    team: teamRef(u.teamId),
    manager: manager ? toUserSummary(manager) : null,
    systemRole: u.systemRole,
    isActive: u.isActive,
    lastSyncedAt: u.lastSyncedAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function toDepartmentDto(d: DepartmentRow): DepartmentDto {
  const head = userById(d.headId);
  return {
    id: d.id,
    name: d.name,
    head: head ? toUserSummary(head) : null,
    parentDepartment: departmentRef(d.parentDepartmentId),
    teamCount: db.teams.filter((t) => t.departmentId === d.id).length,
    userCount: db.users.filter((u) => u.departmentId === d.id && u.isActive).length,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function toTeamDto(t: TeamRow): TeamDto {
  const lead = userById(t.leadId);
  return {
    id: t.id,
    name: t.name,
    department: departmentRef(t.departmentId) ?? { id: t.departmentId, name: 'Unknown' },
    lead: lead ? toUserSummary(lead) : null,
    memberCount: db.users.filter((u) => u.teamId === t.id && u.isActive).length,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function toProjectDto(p: ProjectRow, viewerId: string): ProjectDto {
  const tasks = db.tasks.filter((t) => t.projectId === p.id);
  const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const membership = db.members.find((m) => m.projectId === p.id && m.userId === viewerId);
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    owner: toUserSummary(requireUser(p.ownerId)),
    department: departmentRef(p.departmentId) ?? { id: p.departmentId, name: 'Unknown' },
    status: p.status,
    visibility: p.visibility,
    startDate: p.startDate,
    endDate: p.endDate,
    memberCount: db.members.filter((m) => m.projectId === p.id).length,
    taskCount: tasks.length,
    completedTaskCount: done,
    progress: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
    myRole: membership?.role ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function toMemberDto(m: MemberRow): ProjectMemberDto {
  return {
    projectId: m.projectId,
    user: toUserSummary(requireUser(m.userId)),
    role: m.role,
    createdAt: m.createdAt,
  };
}

export function toTaskDto(t: TaskRow): TaskDto {
  const project = db.projects.find((p) => p.id === t.projectId);
  if (!project) throw new Error(`Mock DB integrity: project ${t.projectId} missing`);
  const assignee = userById(t.assigneeId);
  const loggedHours = db.timeLogs
    .filter((l) => l.taskId === t.id)
    .reduce((sum, l) => sum + l.hours, 0);
  return {
    id: t.id,
    key: `${project.key}-${t.taskNumber}`,
    taskNumber: t.taskNumber,
    project: { id: project.id, key: project.key, name: project.name },
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    priority: t.priority,
    assignee: assignee ? toUserSummary(assignee) : null,
    reporter: toUserSummary(requireUser(t.reporterId)),
    estimatePoints: t.estimatePoints,
    estimateHours: t.estimateHours,
    dueDate: t.dueDate,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    position: t.position,
    loggedHours: Math.round(loggedHours * 100) / 100,
    commentCount: db.comments.filter((c) => c.taskId === t.id).length,
    labels: db.taskLabels
      .filter((tl) => tl.taskId === t.id)
      .map((tl) => db.labels.find((l) => l.id === tl.labelId))
      .filter((l): l is LabelRow => l !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toLabelDto),
    checklist: {
      done: db.checklist.filter((c) => c.taskId === t.id && c.isDone).length,
      total: db.checklist.filter((c) => c.taskId === t.id).length,
    },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function toCommentDto(c: CommentRow): CommentDto {
  return {
    id: c.id,
    taskId: c.taskId,
    author: toUserSummary(requireUser(c.authorId)),
    body: c.body,
    mentions: mentionedUserIds(c.body)
      .map((id) => userById(id))
      .filter((u): u is UserRow => u !== undefined)
      .map(toUserSummary),
    editedAt: c.editedAt,
    createdAt: c.createdAt,
  };
}

export function toTimeLogDto(l: TimeLogRow): TimeLogDto {
  return {
    id: l.id,
    taskId: l.taskId,
    user: toUserSummary(requireUser(l.userId)),
    hours: l.hours,
    workDate: l.workDate,
    note: l.note,
    createdAt: l.createdAt,
  };
}

export function toActivityDto(a: ActivityRow): TaskActivityDto {
  return {
    id: a.id,
    taskId: a.taskId,
    actor: toUserSummary(requireUser(a.actorId)),
    action: a.action,
    field: a.field,
    oldValue: a.oldValue,
    newValue: a.newValue,
    createdAt: a.createdAt,
  };
}
