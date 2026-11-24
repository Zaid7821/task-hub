// Compile-time guard: fails `tsc` if packages/shared enums drift from the Prisma schema.
import type * as Shared from '@aionos/shared';
import type * as Db from '../generated/prisma/enums.js';

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

export type EnumParity = [
  Assert<Equals<Shared.SystemRole, Db.SystemRole>>,
  Assert<Equals<Shared.ProjectStatus, Db.ProjectStatus>>,
  Assert<Equals<Shared.ProjectVisibility, Db.ProjectVisibility>>,
  Assert<Equals<Shared.ProjectMemberRole, Db.ProjectMemberRole>>,
  Assert<Equals<Shared.TaskStatus, Db.TaskStatus>>,
  Assert<Equals<Shared.TaskPriority, Db.TaskPriority>>,
  Assert<Equals<Shared.TaskType, Db.TaskType>>,
  Assert<Equals<Shared.LabelColor, Db.LabelColor>>,
  Assert<Equals<Shared.NotificationType, Db.NotificationType>>,
  Assert<Equals<Shared.TimesheetStatus, Db.TimesheetStatus>>,
];
