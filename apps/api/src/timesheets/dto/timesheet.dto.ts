import type {
  SubmitTimesheetInput,
  TimesheetApprovalQuery,
  TimesheetDecisionInput,
} from '@aionos/shared';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ISO_DATE, TrimOptional } from '../../common/validation.js';
import { TimesheetStatus } from '../../generated/prisma/enums.js';

const WEEK_MESSAGE = 'weekStart must be a Monday (YYYY-MM-DD)';

export class WeekQueryDto {
  @IsOptional() @Matches(ISO_DATE, { message: WEEK_MESSAGE }) weekStart?: string;
}

export class SubmitTimesheetDto implements SubmitTimesheetInput {
  @Matches(ISO_DATE, { message: WEEK_MESSAGE }) weekStart!: string;
}

export class ApprovalQueryDto implements TimesheetApprovalQuery {
  @IsOptional() @IsEnum(TimesheetStatus) status?: TimesheetStatus;
}

export class TimesheetDecisionDto implements TimesheetDecisionInput {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(1000) note?: string;
}
