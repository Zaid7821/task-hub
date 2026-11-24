import type { CreateTimeLogInput } from '@aionos/shared';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { ISO_DATE, TrimOptional } from '../../common/validation.js';

const HOURS_MESSAGE = 'hours must be between 0.25 and 24, in steps of 0.25';

export class CreateTimeLogDto implements CreateTimeLogInput {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: HOURS_MESSAGE })
  @Min(0.25, { message: HOURS_MESSAGE })
  @Max(24, { message: HOURS_MESSAGE })
  hours!: number;

  @Matches(ISO_DATE, { message: 'workDate must be a date (YYYY-MM-DD)' }) workDate!: string;

  @IsOptional()
  @TrimOptional()
  @IsString()
  @MaxLength(500, { message: 'note must be at most 500 characters' })
  note?: string;
}

export class TimeLogQueryDto extends PaginationQueryDto {}
