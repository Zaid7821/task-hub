import type { IsoDateTime, NamedRef, PaginationQuery, UserSummary } from './common.js';

/** GET /departments (items) */
export interface DepartmentDto {
  id: string;
  name: string;
  head: UserSummary | null;
  parentDepartment: NamedRef | null;
  teamCount: number;
  userCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** GET /teams (items) */
export interface TeamDto {
  id: string;
  name: string;
  department: NamedRef;
  lead: UserSummary | null;
  memberCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DepartmentListQuery extends PaginationQuery {
  search?: string;
}

export interface TeamListQuery extends PaginationQuery {
  search?: string;
  departmentId?: string;
}
