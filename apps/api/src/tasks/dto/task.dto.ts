import type {
  ChangeTaskStatusInput,
  CreateTaskInput,
  ReassignTaskInput,
  SortDirection,
  TaskListQuery,
  TaskSortField,
  UpdateTaskInput,
} from '@aionos/shared';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
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
import { TaskPriority, TaskStatus, TaskType } from '../../generated/prisma/enums.js';

const SORT_FIELDS: TaskSortField[] = [
  'taskNumber',
  'title',
  'status',
  'priority',
  'dueDate',
  'updatedAt',
];
const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ASSIGNEE_FILTER = new RegExp(`^(me|none|${UUID_SOURCE})$`, 'i');
const TITLE_MESSAGE = 'title must be between 3 and 255 characters';
const NULLABLE = (_o: object, v: unknown) => v !== undefined && v !== null;

export class TaskQueryDto extends PaginationQueryDto implements TaskListQuery {
  @IsOptional() @IsUUID() projectId?: string;

  @IsOptional()
  @Matches(ASSIGNEE_FILTER, { message: 'assigneeId must be a user id, "me" or "none"' })
  assigneeId?: string;

  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsEnum(TaskType) type?: TaskType;
  @IsOptional() @IsUUID() labelId?: string;
  @IsOptional() @TrimOptional() @IsString() @MaxLength(100) search?: string;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'dueBefore must be a date (YYYY-MM-DD)' })
  dueBefore?: string;

  @IsOptional() @ToBoolean() @IsBoolean() overdue?: boolean;
  @IsOptional() @IsIn(SORT_FIELDS) sort?: TaskSortField;
  @IsOptional() @IsIn(['asc', 'desc']) order?: SortDirection;
}

/** Fields shared by create and update. */
class TaskFieldsDto {
  @IsOptional() @Trim() @IsString() @MaxLength(20000) description?: string | null;

  @ValidateIf(NULLABLE)
  @IsInt({ message: 'estimatePoints must be an integer between 0 and 100' })
  @Min(0, { message: 'estimatePoints must be an integer between 0 and 100' })
  @Max(100, { message: 'estimatePoints must be an integer between 0 and 100' })
  estimatePoints?: number | null;

  @ValidateIf(NULLABLE)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'estimateHours must be between 0 and 999' })
  @Min(0, { message: 'estimateHours must be between 0 and 999' })
  @Max(999, { message: 'estimateHours must be between 0 and 999' })
  estimateHours?: number | null;

  @ValidateIf(NULLABLE)
  @Matches(ISO_DATE, { message: 'dueDate must be a date (YYYY-MM-DD)' })
  dueDate?: string | null;
}

export class CreateTaskDto extends TaskFieldsDto implements CreateTaskInput {
  @Trim() @IsString() @Length(3, 255, { message: TITLE_MESSAGE }) title!: string;
  @IsEnum(TaskType, { message: 'type is invalid' }) type!: TaskType;
  @IsEnum(TaskPriority, { message: 'priority is invalid' }) priority!: TaskPriority;
  @ValidateIf(NULLABLE) @IsUUID() assigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true, message: 'labelIds must be labels of this project' })
  labelIds?: string[];

  declare description?: string;
}

export class UpdateTaskDto extends TaskFieldsDto implements UpdateTaskInput {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @Length(3, 255, { message: TITLE_MESSAGE })
  title?: string;
  @IsOptionalNonNull() @IsEnum(TaskType, { message: 'type is invalid' }) type?: TaskType;
  @IsOptionalNonNull()
  @IsEnum(TaskPriority, { message: 'priority is invalid' })
  priority?: TaskPriority;
}

export class ChangeStatusDto implements ChangeTaskStatusInput {
  @IsEnum(TaskStatus, { message: 'status is invalid' }) status!: TaskStatus;
  @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false }) position?: number;
}

export class ReassignDto implements ReassignTaskInput {
  @ValidateIf(NULLABLE)
  @IsUUID('all', { message: 'assignee must be a project member (not a viewer)' })
  assigneeId!: string | null;
}

export class ActivityQueryDto extends PaginationQueryDto {}
