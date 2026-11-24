import type { AddProjectMemberInput, UpdateProjectMemberInput } from '@aionos/shared';
import { IsIn, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { ProjectMemberRole } from '../../generated/prisma/enums.js';

/** OWNER is set only at project creation, never through the members API. */
const ASSIGNABLE_ROLES = [ProjectMemberRole.MEMBER, ProjectMemberRole.VIEWER] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export class MemberQueryDto extends PaginationQueryDto {}

export class AddMemberDto implements AddProjectMemberInput {
  @IsUUID('all', { message: 'userId is required' }) userId!: string;
  @IsIn(ASSIGNABLE_ROLES, { message: 'role must be MEMBER or VIEWER' }) role!: AssignableRole;
}

export class UpdateMemberDto implements UpdateProjectMemberInput {
  @IsIn(ASSIGNABLE_ROLES, { message: 'role must be MEMBER or VIEWER' }) role!: AssignableRole;
}
