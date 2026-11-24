import type {
  CreateProjectInput,
  ProjectListQuery,
  ProjectSortField,
  SortDirection,
  UpdateProjectInput,
} from '@aionos/shared';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import {
  ISO_DATE,
  IsOptionalNonNull,
  ToBoolean,
  Trim,
  TrimOptional,
} from '../../common/validation.js';
import { ProjectStatus, ProjectVisibility } from '../../generated/prisma/enums.js';

const SORT_FIELDS: ProjectSortField[] = ['name', 'key', 'createdAt', 'progress'];
const DATE_MESSAGE = (field: string) => `${field} must be a date (YYYY-MM-DD)`;

export class ProjectQueryDto extends PaginationQueryDto implements ProjectListQuery {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsEnum(ProjectVisibility) visibility?: ProjectVisibility;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @ToBoolean() @IsBoolean() mine?: boolean;
  @IsOptional() @ToBoolean() @IsBoolean() includeArchived?: boolean;
  @IsOptional() @IsIn(SORT_FIELDS) sort?: ProjectSortField;
  @IsOptional() @IsIn(['asc', 'desc']) order?: SortDirection;
}

export class CreateProjectDto implements CreateProjectInput {
  @Trim()
  @IsString()
  @Matches(/^[A-Z][A-Z0-9]{1,9}$/, {
    message: 'key must be 2-10 uppercase letters/digits, starting with a letter',
  })
  key!: string;

  @Trim()
  @IsString()
  @Length(3, 200, { message: 'name must be between 3 and 200 characters' })
  name!: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(5000) description?: string;

  @IsUUID('all', { message: 'departmentId is required' }) departmentId!: string;

  @IsEnum(ProjectVisibility) visibility!: ProjectVisibility;

  @IsOptional() @Matches(ISO_DATE, { message: DATE_MESSAGE('startDate') }) startDate?: string;
  @IsOptional() @Matches(ISO_DATE, { message: DATE_MESSAGE('endDate') }) endDate?: string;
}

export class UpdateProjectDto implements UpdateProjectInput {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @Length(3, 200, { message: 'name must be between 3 and 200 characters' })
  name?: string;

  @IsOptional() @Trim() @IsString() @MaxLength(5000) description?: string | null;

  @IsOptionalNonNull() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptionalNonNull() @IsEnum(ProjectVisibility) visibility?: ProjectVisibility;

  @ValidateIf((_o: object, v: unknown) => v !== undefined && v !== null)
  @Matches(ISO_DATE, { message: DATE_MESSAGE('startDate') })
  startDate?: string | null;

  @ValidateIf((_o: object, v: unknown) => v !== undefined && v !== null)
  @Matches(ISO_DATE, { message: DATE_MESSAGE('endDate') })
  endDate?: string | null;
}
