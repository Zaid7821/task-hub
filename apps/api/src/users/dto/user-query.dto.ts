import type { UserListQuery } from '@aionos/shared';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { ToBoolean, TrimOptional } from '../../common/validation.js';

export class UserQueryDto extends PaginationQueryDto implements UserListQuery {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
}
