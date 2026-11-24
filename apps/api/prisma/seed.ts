// Local/dev seed. Wipes all data and recreates a small, deterministic org.
// Run with `pnpm db:seed`. Refuses to run when NODE_ENV=production.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  LabelColor,
  NotificationType,
  ProjectMemberRole,
  ProjectStatus,
  ProjectVisibility,
  SystemRole,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimesheetStatus,
} from '../src/generated/prisma/enums.js';

const EMAIL_DOMAIN = 'aionos.local';

type DeptKey = 'ENG' | 'HR' | 'FIN';
type TeamKey = 'PLATFORM' | 'APPS' | 'TALENT' | 'PEOPLE_OPS' | 'ACCOUNTS' | 'FPA';

interface UserSpec {
  key: string;
  name: string;
  title: string;
  dept: DeptKey;
  team?: TeamKey;
  manager?: string;
  role: SystemRole;
}

interface ProjectSpec {
  key: string;
  name: string;
  description: string;
  dept: DeptKey;
  owner: string;
  visibility: ProjectVisibility;
  members: { user: string; role: ProjectMemberRole }[];
  tasks: [title: string, type: TaskType][];
}

const DEPARTMENTS: { key: DeptKey; name: string }[] = [
  { key: 'ENG', name: 'Engineering' },
  { key: 'HR', name: 'Human Resources' },
  { key: 'FIN', name: 'Finance' },
];

const TEAMS: { key: TeamKey; name: string; dept: DeptKey }[] = [
  { key: 'PLATFORM', name: 'Platform', dept: 'ENG' },
  { key: 'APPS', name: 'Product Apps', dept: 'ENG' },
  { key: 'TALENT', name: 'Talent Acquisition', dept: 'HR' },
  { key: 'PEOPLE_OPS', name: 'People Operations', dept: 'HR' },
  { key: 'ACCOUNTS', name: 'Accounts', dept: 'FIN' },
  { key: 'FPA', name: 'FP&A', dept: 'FIN' },
];

// Ordered so every manager appears before their reports.
const USERS: UserSpec[] = [
  {
    key: 'admin',
    name: 'Aarav Sharma',
    title: 'IT Administrator',
    dept: 'ENG',
    role: SystemRole.SUPER_ADMIN,
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    title: 'Head of Engineering',
    dept: 'ENG',
    role: SystemRole.DEPARTMENT_HEAD,
  },
  {
    key: 'rohan',
    name: 'Rohan Mehta',
    title: 'Head of HR',
    dept: 'HR',
    role: SystemRole.DEPARTMENT_HEAD,
  },
  {
    key: 'meera',
    name: 'Meera Iyer',
    title: 'Head of Finance',
    dept: 'FIN',
    role: SystemRole.DEPARTMENT_HEAD,
  },
  {
    key: 'vikram',
    name: 'Vikram Rao',
    title: 'Engineering Manager',
    dept: 'ENG',
    team: 'PLATFORM',
    manager: 'priya',
    role: SystemRole.MANAGER,
  },
  {
    key: 'ananya',
    name: 'Ananya Gupta',
    title: 'Engineering Manager',
    dept: 'ENG',
    team: 'APPS',
    manager: 'priya',
    role: SystemRole.MANAGER,
  },
  {
    key: 'kabir',
    name: 'Kabir Singh',
    title: 'Talent Acquisition Lead',
    dept: 'HR',
    team: 'TALENT',
    manager: 'rohan',
    role: SystemRole.MANAGER,
  },
  {
    key: 'neha',
    name: 'Neha Kapoor',
    title: 'Accounts Manager',
    dept: 'FIN',
    team: 'ACCOUNTS',
    manager: 'meera',
    role: SystemRole.MANAGER,
  },
  {
    key: 'arjun',
    name: 'Arjun Das',
    title: 'Senior Software Engineer',
    dept: 'ENG',
    team: 'PLATFORM',
    manager: 'vikram',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'sneha',
    name: 'Sneha Pillai',
    title: 'Software Engineer',
    dept: 'ENG',
    team: 'PLATFORM',
    manager: 'vikram',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'ishaan',
    name: 'Ishaan Verma',
    title: 'Frontend Engineer',
    dept: 'ENG',
    team: 'APPS',
    manager: 'ananya',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'diya',
    name: 'Diya Menon',
    title: 'QA Engineer',
    dept: 'ENG',
    team: 'APPS',
    manager: 'ananya',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'riya',
    name: 'Riya Joshi',
    title: 'Recruiter',
    dept: 'HR',
    team: 'TALENT',
    manager: 'kabir',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'aditya',
    name: 'Aditya Kulkarni',
    title: 'HR Generalist',
    dept: 'HR',
    team: 'PEOPLE_OPS',
    manager: 'rohan',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'kavya',
    name: 'Kavya Reddy',
    title: 'Accountant',
    dept: 'FIN',
    team: 'ACCOUNTS',
    manager: 'neha',
    role: SystemRole.EMPLOYEE,
  },
  {
    key: 'sameer',
    name: 'Sameer Khan',
    title: 'Financial Analyst (Intern)',
    dept: 'FIN',
    team: 'FPA',
    manager: 'meera',
    role: SystemRole.VIEWER,
  },
];

const TEAM_LEADS: Partial<Record<TeamKey, string>> = {
  PLATFORM: 'vikram',
  APPS: 'ananya',
  TALENT: 'kabir',
  ACCOUNTS: 'neha',
};

const PROJECTS: ProjectSpec[] = [
  {
    key: 'WTR',
    name: 'Work Tracker',
    description: 'Internal project and task tracking platform for AIonOS.',
    dept: 'ENG',
    owner: 'vikram',
    visibility: ProjectVisibility.PUBLIC,
    members: [
      { user: 'vikram', role: ProjectMemberRole.OWNER },
      { user: 'ananya', role: ProjectMemberRole.MEMBER },
      { user: 'arjun', role: ProjectMemberRole.MEMBER },
      { user: 'sneha', role: ProjectMemberRole.MEMBER },
      { user: 'ishaan', role: ProjectMemberRole.MEMBER },
      { user: 'diya', role: ProjectMemberRole.MEMBER },
    ],
    tasks: [
      ['Set up monorepo and CI pipeline', TaskType.TASK],
      ['Design database schema', TaskType.TASK],
      ['Integrate Entra ID SSO', TaskType.TASK],
      ['Build Kanban board view', TaskType.TASK],
      ['Task detail drawer', TaskType.TASK],
      ['Time logging UI', TaskType.TASK],
      ['Fix pagination off-by-one on task list', TaskType.BUG],
      ['Project member management screen', TaskType.TASK],
      ['Dashboard: project summary widget', TaskType.TASK],
      ['Export tasks to CSV', TaskType.REQUEST],
      ['Audit log viewer for admins', TaskType.TASK],
      ['Fix timezone shift in due dates', TaskType.BUG],
    ],
  },
  {
    key: 'HRP',
    name: 'Hiring Pipeline 2027',
    description: 'Streamline recruiting from job posting to onboarding.',
    dept: 'HR',
    owner: 'kabir',
    visibility: ProjectVisibility.DEPARTMENT,
    members: [
      { user: 'kabir', role: ProjectMemberRole.OWNER },
      { user: 'riya', role: ProjectMemberRole.MEMBER },
      { user: 'aditya', role: ProjectMemberRole.MEMBER },
      { user: 'ishaan', role: ProjectMemberRole.MEMBER },
      { user: 'rohan', role: ProjectMemberRole.VIEWER },
    ],
    tasks: [
      ['Define hiring workflow stages', TaskType.TASK],
      ['Job description templates', TaskType.TASK],
      ['Integrate careers page form', TaskType.TASK],
      ['Interview feedback form', TaskType.TASK],
      ['Bulk import candidates from spreadsheet', TaskType.REQUEST],
      ['Fix duplicate candidate entries', TaskType.BUG],
      ['Offer letter approval flow', TaskType.TASK],
      ['New joiner onboarding checklist', TaskType.TASK],
      ['Recruiter weekly report', TaskType.TASK],
    ],
  },
  {
    key: 'FIN',
    name: 'Quarterly Close Automation',
    description: 'Reduce manual effort in the quarterly financial close.',
    dept: 'FIN',
    owner: 'neha',
    visibility: ProjectVisibility.PRIVATE,
    members: [
      { user: 'neha', role: ProjectMemberRole.OWNER },
      { user: 'kavya', role: ProjectMemberRole.MEMBER },
      { user: 'arjun', role: ProjectMemberRole.MEMBER },
      { user: 'sameer', role: ProjectMemberRole.VIEWER },
    ],
    tasks: [
      ['Map month-end close checklist', TaskType.TASK],
      ['Automate bank reconciliation', TaskType.TASK],
      ['Vendor invoice OCR pilot', TaskType.TASK],
      ['Fix rounding errors in GL export', TaskType.BUG],
      ['Accrual schedule template', TaskType.TASK],
      ['Cost center spend report', TaskType.REQUEST],
      ['Intercompany settlement script', TaskType.TASK],
      ['Close calendar reminders', TaskType.TASK],
      ['Variance analysis dashboard', TaskType.TASK],
    ],
  },
];

const STATUS_CYCLE = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];
const PRIORITY_CYCLE = [
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.LOW,
  TaskPriority.CRITICAL,
];
const POINTS_CYCLE = [3, 5, 2, 8, 1];
const HOURS_CYCLE = [1.5, 2, 3, 4, 6.5];

const COMMENT_LINES = [
  'Picked this up, will share an update by end of day.',
  'Can we confirm the acceptance criteria before starting?',
  'Blocked on access, raised a ticket with IT.',
  'Looks good to me, moving forward.',
  'Added notes from the sync call.',
];

// Labels per project; applied to task i by: i%3===0 -> 1st, i%4===1 -> 2nd, i%5===2 -> 3rd.
const LABELS: Record<string, [name: string, color: LabelColor][]> = {
  WTR: [
    ['frontend', LabelColor.BLUE],
    ['backend', LabelColor.PURPLE],
    ['urgent', LabelColor.RED],
  ],
  HRP: [
    ['recruiting', LabelColor.TEAL],
    ['policy', LabelColor.YELLOW],
  ],
  FIN: [
    ['audit', LabelColor.ORANGE],
    ['automation', LabelColor.GREEN],
  ],
};

// Checklists on IN_PROGRESS (1 item done) and IN_REVIEW (2 done) tasks.
const CHECKLIST_LINES = [
  'Agree on the approach',
  'Implement the change',
  'Update the documentation',
];

// Last week's timesheets: hours per weekday (Mon..), alternating between the user's first two
// assigned tasks. Logged on top of the regular seed time logs.
const TIMESHEETS: {
  user: string;
  approver: string;
  status: TimesheetStatus;
  hours: number[];
}[] = [
  { user: 'arjun', approver: 'vikram', status: TimesheetStatus.SUBMITTED, hours: [6, 7.5, 5, 8] },
  { user: 'kavya', approver: 'neha', status: TimesheetStatus.APPROVED, hours: [8, 8, 7, 8, 6] },
];

/** Monday of the current week (UTC), offset by whole weeks. */
function mondayOffset(weeks: number): Date {
  const today = dayOffset(0);
  return dayOffset(-((today.getUTCDay() + 6) % 7) + weeks * 7);
}

/** Midnight UTC, offset by `days` from today. Suitable for @db.Date columns. */
function dayOffset(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

function fakeEntraObjectId(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
}

async function seed(prisma: PrismaClient): Promise<void> {
  // Table names are constants, not user input.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE notifications, timesheet_weeks, saved_views, checklist_items, task_labels, labels, audit_logs, task_activities, comments, time_logs, tasks, project_members, projects, users, teams, departments CASCADE',
  );

  const deptIds = {} as Record<DeptKey, string>;
  for (const d of DEPARTMENTS) {
    deptIds[d.key] = (await prisma.department.create({ data: { name: d.name } })).id;
  }

  const teamIds = {} as Record<TeamKey, string>;
  for (const t of TEAMS) {
    teamIds[t.key] = (
      await prisma.team.create({ data: { name: t.name, departmentId: deptIds[t.dept] } })
    ).id;
  }

  const userIds: Record<string, string> = {};
  for (const [i, u] of USERS.entries()) {
    const created = await prisma.user.create({
      data: {
        entraObjectId: fakeEntraObjectId(i + 1),
        email: `${u.key}@${EMAIL_DOMAIN}`,
        displayName: u.name,
        jobTitle: u.title,
        employeeCode: `AIO-${(1001 + i).toString()}`,
        departmentId: deptIds[u.dept],
        teamId: u.team ? teamIds[u.team] : null,
        managerId: u.manager ? userIds[u.manager] : null,
        systemRole: u.role,
        // Never synced: the directory sync only deactivates users it imported itself.
        lastSyncedAt: null,
      },
    });
    userIds[u.key] = created.id;
  }
  const uid = (key: string): string => {
    const id = userIds[key];
    if (!id) throw new Error(`Seed references unknown user "${key}"`);
    return id;
  };

  await prisma.department.update({ where: { id: deptIds.ENG }, data: { headId: uid('priya') } });
  await prisma.department.update({ where: { id: deptIds.HR }, data: { headId: uid('rohan') } });
  await prisma.department.update({ where: { id: deptIds.FIN }, data: { headId: uid('meera') } });
  for (const [team, lead] of Object.entries(TEAM_LEADS)) {
    await prisma.team.update({
      where: { id: teamIds[team as TeamKey] },
      data: { leadId: uid(lead) },
    });
  }

  let taskCount = 0;
  let timeLogCount = 0;
  let commentCount = 0;
  let notificationCount = 0;
  /** Task ids per assignee, in seed order (used for timesheet history). */
  const assignedTasks = new Map<string, string[]>();

  for (const p of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        key: p.key,
        name: p.name,
        description: p.description,
        ownerId: uid(p.owner),
        departmentId: deptIds[p.dept],
        status: ProjectStatus.ACTIVE,
        visibility: p.visibility,
        startDate: dayOffset(-45),
        endDate: dayOffset(90),
        taskCounter: p.tasks.length,
        members: {
          create: p.members.map((m) => ({ userId: uid(m.user), role: m.role })),
        },
      },
    });

    const assignees = p.members
      .filter((m) => m.role !== ProjectMemberRole.VIEWER)
      .map((m) => uid(m.user));
    const reporterId = uid(p.owner);
    const positionInColumn = new Map<TaskStatus, number>();
    const labelIds: string[] = [];
    for (const [name, color] of LABELS[p.key] ?? []) {
      labelIds.push(
        (await prisma.label.create({ data: { projectId: project.id, name, color } })).id,
      );
    }

    for (const [i, [title, type]] of p.tasks.entries()) {
      const status = pick(STATUS_CYCLE, i);
      const assigneeId = i % 7 === 6 ? null : pick(assignees, i);
      const points = pick(POINTS_CYCLE, i);
      const position = (positionInColumn.get(status) ?? 0) + 1000;
      positionInColumn.set(status, position);
      const started = status !== TaskStatus.TODO;

      const task = await prisma.task.create({
        data: {
          projectId: project.id,
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
          dueDate: dayOffset(-6 + i * 4),
          startedAt: started ? dayOffset(-14 + i) : null,
          completedAt: status === TaskStatus.DONE ? dayOffset(-2) : null,
          position,
        },
      });
      taskCount++;

      const actorId = assigneeId ?? reporterId;
      await prisma.taskActivity.createMany({
        data: [
          { taskId: task.id, actorId: reporterId, action: 'CREATED' },
          ...(assigneeId
            ? [
                {
                  taskId: task.id,
                  actorId: reporterId,
                  action: 'ASSIGNED',
                  field: 'assigneeId',
                  newValue: assigneeId,
                },
              ]
            : []),
          ...(started
            ? [
                {
                  taskId: task.id,
                  actorId,
                  action: 'STATUS_CHANGED',
                  field: 'status',
                  oldValue: TaskStatus.TODO,
                  newValue: status,
                },
              ]
            : []),
        ],
      });

      if (started && assigneeId) {
        const logs = status === TaskStatus.DONE ? 3 : status === TaskStatus.IN_REVIEW ? 2 : 1;
        await prisma.timeLog.createMany({
          data: Array.from({ length: logs }, (_, k) => ({
            taskId: task.id,
            userId: assigneeId,
            hours: pick(HOURS_CYCLE, i + k),
            workDate: dayOffset(-(k + 1)),
            note: k === 0 ? 'Implementation work' : 'Follow-up and review fixes',
          })),
        });
        timeLogCount += logs;
      }

      if (i % 3 === 0) {
        const authors = assigneeId ? [reporterId, assigneeId] : [reporterId];
        await prisma.comment.createMany({
          data: authors.map((authorId, k) => ({
            taskId: task.id,
            authorId,
            body: pick(COMMENT_LINES, i + k),
          })),
        });
        commentCount += authors.length;
      }

      const taskLabelIds = [
        i % 3 === 0 ? labelIds[0] : undefined,
        i % 4 === 1 ? labelIds[1] : undefined,
        i % 5 === 2 ? labelIds[2] : undefined,
      ].filter((id): id is string => id !== undefined);
      if (taskLabelIds.length > 0) {
        await prisma.taskLabel.createMany({
          data: taskLabelIds.map((labelId) => ({ taskId: task.id, labelId })),
        });
      }

      if (status === TaskStatus.IN_PROGRESS || status === TaskStatus.IN_REVIEW) {
        const doneCount = status === TaskStatus.IN_REVIEW ? 2 : 1;
        await prisma.checklistItem.createMany({
          data: CHECKLIST_LINES.map((line, k) => ({
            taskId: task.id,
            title: line,
            isDone: k < doneCount,
            doneAt: k < doneCount ? dayOffset(-1) : null,
            doneById: k < doneCount ? actorId : null,
            position: (k + 1) * 1000,
          })),
        });
      }

      if (assigneeId) {
        assignedTasks.set(assigneeId, [...(assignedTasks.get(assigneeId) ?? []), task.id]);
        if (assigneeId !== reporterId) {
          await prisma.notification.create({
            data: {
              userId: assigneeId,
              type: NotificationType.TASK_ASSIGNED,
              actorId: reporterId,
              taskId: task.id,
              readAt: i % 2 === 0 ? dayOffset(-1) : null,
            },
          });
          notificationCount++;
        }
      }
    }
  }

  const lastMonday = mondayOffset(-1);
  for (const sheet of TIMESHEETS) {
    const userId = uid(sheet.user);
    const tasks = (assignedTasks.get(userId) ?? []).slice(0, 2);
    const firstTask = tasks[0];
    if (!firstTask) continue;
    await prisma.timeLog.createMany({
      data: sheet.hours.map((hours, day) => ({
        taskId: tasks[day % tasks.length] ?? firstTask,
        userId,
        hours,
        workDate: new Date(lastMonday.getTime() + day * 86_400_000),
        note: 'Planned work',
      })),
    });
    timeLogCount += sheet.hours.length;
    const approved = sheet.status === TimesheetStatus.APPROVED;
    const week = await prisma.timesheetWeek.create({
      data: {
        userId,
        weekStart: lastMonday,
        status: sheet.status,
        submittedAt: dayOffset(-3),
        approverId: uid(sheet.approver),
        decidedAt: approved ? dayOffset(-2) : null,
      },
    });
    await prisma.notification.create({
      data: approved
        ? {
            userId,
            type: NotificationType.TIMESHEET_APPROVED,
            actorId: uid(sheet.approver),
            timesheetId: week.id,
          }
        : {
            userId: uid(sheet.approver),
            type: NotificationType.TIMESHEET_SUBMITTED,
            actorId: userId,
            timesheetId: week.id,
          },
    });
    notificationCount++;
  }

  console.warn(
    `Seeded ${DEPARTMENTS.length} departments, ${TEAMS.length} teams, ${USERS.length} users, ` +
      `${PROJECTS.length} projects, ${taskCount} tasks, ${timeLogCount} time logs, ${commentCount} comments, ` +
      `${notificationCount} notifications, ${TIMESHEETS.length} timesheets.`,
  );
  console.warn(`Dev login emails: ${USERS.map((u) => `${u.key}@${EMAIL_DOMAIN}`).join(', ')}`);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set (see apps/api/.env.example)');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
