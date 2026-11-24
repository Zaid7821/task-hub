import type { DepartmentListQuery, TeamListQuery } from '@aionos/shared';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { TrimOptional } from '../../common/validation.js';

export class DepartmentQueryDto extends PaginationQueryDto implements DepartmentListQuery {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(100) search?: string;
}

export class TeamQueryDto extends PaginationQueryDto implements TeamListQuery {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID() departmentId?: string;
}
