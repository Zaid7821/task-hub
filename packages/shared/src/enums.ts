// Mirrors the enums in apps/api/prisma/schema.prisma. The API asserts at compile
// time that these stay identical to the Prisma-generated enums.

export const SystemRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  VIEWER: 'VIEWER',
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectVisibility = {
  PUBLIC: 'PUBLIC',
  DEPARTMENT: 'DEPARTMENT',
  PRIVATE: 'PRIVATE',
} as const;
export type ProjectVisibility = (typeof ProjectVisibility)[keyof typeof ProjectVisibility];

export const ProjectMemberRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;
export type ProjectMemberRole = (typeof ProjectMemberRole)[keyof typeof ProjectMemberRole];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskType = {
  TASK: 'TASK',
  BUG: 'BUG',
  REQUEST: 'REQUEST',
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const LabelColor = {
  GRAY: 'GRAY',
  RED: 'RED',
  ORANGE: 'ORANGE',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  TEAL: 'TEAL',
  BLUE: 'BLUE',
  PURPLE: 'PURPLE',
  PINK: 'PINK',
} as const;
export type LabelColor = (typeof LabelColor)[keyof typeof LabelColor];

export const NotificationType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  MENTIONED: 'MENTIONED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  TIMESHEET_SUBMITTED: 'TIMESHEET_SUBMITTED',
  TIMESHEET_APPROVED: 'TIMESHEET_APPROVED',
  TIMESHEET_REJECTED: 'TIMESHEET_REJECTED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const TimesheetStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type TimesheetStatus = (typeof TimesheetStatus)[keyof typeof TimesheetStatus];
