import type {
  ProjectMemberRole,
  ProjectStatus,
  ProjectVisibility,
  SystemRole,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimesheetStatus,
} from '@aionos/shared';

export const systemRoleLabel: Record<SystemRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  DEPARTMENT_HEAD: 'Department Head',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  VIEWER: 'Viewer',
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const projectVisibilityLabel: Record<ProjectVisibility, string> = {
  PUBLIC: 'Public',
  DEPARTMENT: 'Department',
  PRIVATE: 'Private',
};

export const projectMemberRoleLabel: Record<ProjectMemberRole, string> = {
  OWNER: 'Owner',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const taskPriorityLabel: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const timesheetStatusLabel: Record<TimesheetStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const taskTypeLabel: Record<TaskType, string> = {
  TASK: 'Task',
  BUG: 'Bug',
  REQUEST: 'Request',
};
