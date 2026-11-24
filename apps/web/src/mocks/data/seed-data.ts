// Mirrors apps/api/prisma/seed.ts so mock mode shows the same org, users, projects and task keys.
// If you change the API seed, update this file too.
import {
  LabelColor,
  ProjectMemberRole,
  ProjectVisibility,
  SystemRole,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimesheetStatus,
} from '@aionos/shared';

export const EMAIL_DOMAIN = 'aionos.local';

export type DeptKey = 'ENG' | 'HR' | 'FIN';
export type TeamKey = 'PLATFORM' | 'APPS' | 'TALENT' | 'PEOPLE_OPS' | 'ACCOUNTS' | 'FPA';

export interface SeedUser {
  key: string;
  name: string;
  title: string;
  dept: DeptKey;
  team?: TeamKey;
  manager?: string;
  role: SystemRole;
}

export interface SeedProject {
  key: string;
  name: string;
  description: string;
  dept: DeptKey;
  owner: string;
  visibility: ProjectVisibility;
  members: { user: string; role: ProjectMemberRole }[];
  tasks: [title: string, type: TaskType][];
}

export const DEPARTMENTS: { key: DeptKey; name: string; head: string }[] = [
  { key: 'ENG', name: 'Engineering', head: 'priya' },
  { key: 'HR', name: 'Human Resources', head: 'rohan' },
  { key: 'FIN', name: 'Finance', head: 'meera' },
];

export const TEAMS: { key: TeamKey; name: string; dept: DeptKey; lead?: string }[] = [
  { key: 'PLATFORM', name: 'Platform', dept: 'ENG', lead: 'vikram' },
  { key: 'APPS', name: 'Product Apps', dept: 'ENG', lead: 'ananya' },
  { key: 'TALENT', name: 'Talent Acquisition', dept: 'HR', lead: 'kabir' },
  { key: 'PEOPLE_OPS', name: 'People Operations', dept: 'HR' },
  { key: 'ACCOUNTS', name: 'Accounts', dept: 'FIN', lead: 'neha' },
  { key: 'FPA', name: 'FP&A', dept: 'FIN' },
];

export const USERS: SeedUser[] = [
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

export const PROJECTS: SeedProject[] = [
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

// Same deterministic cycles as the API seed.
export const STATUS_CYCLE = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];
export const PRIORITY_CYCLE = [
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.LOW,
  TaskPriority.CRITICAL,
];
export const POINTS_CYCLE = [3, 5, 2, 8, 1];
export const HOURS_CYCLE = [1.5, 2, 3, 4, 6.5];
export const COMMENT_LINES = [
  'Picked this up, will share an update by end of day.',
  'Can we confirm the acceptance criteria before starting?',
  'Blocked on access, raised a ticket with IT.',
  'Looks good to me, moving forward.',
  'Added notes from the sync call.',
];

// Same rules as the API seed: labels on task i by i%3===0 -> 1st, i%4===1 -> 2nd, i%5===2 -> 3rd.
export const LABELS: Record<string, [name: string, color: LabelColor][]> = {
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

export const CHECKLIST_LINES = [
  'Agree on the approach',
  'Implement the change',
  'Update the documentation',
];

export const TIMESHEETS: {
  user: string;
  approver: string;
  status: TimesheetStatus;
  hours: number[];
}[] = [
  { user: 'arjun', approver: 'vikram', status: TimesheetStatus.SUBMITTED, hours: [6, 7.5, 5, 8] },
  { user: 'kavya', approver: 'neha', status: TimesheetStatus.APPROVED, hours: [8, 8, 7, 8, 6] },
];

export const seedEmail = (key: string): string => `${key}@${EMAIL_DOMAIN}`;
