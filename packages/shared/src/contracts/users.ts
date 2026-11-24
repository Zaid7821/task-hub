import type { SystemRole } from '../enums.js';
import type { IsoDateTime, NamedRef, PaginationQuery, UserSummary } from './common.js';

/** GET /users/:id, GET /users (items), GET /users/me */
export interface UserDto extends UserSummary {
  employeeCode: string | null;
  department: NamedRef | null;
  team: NamedRef | null;
  manager: UserSummary | null;
  systemRole: SystemRole;
  isActive: boolean;
  lastSyncedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** GET /users */
export interface UserListQuery extends PaginationQuery {
  search?: string;
  departmentId?: string;
  teamId?: string;
  isActive?: boolean;
}
