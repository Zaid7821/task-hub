import type { CreateChecklistItemInput, UpdateChecklistItemInput } from '@aionos/shared';
import { IsBoolean, IsNumber, IsString, Length } from 'class-validator';
import { IsOptionalNonNull, Trim } from '../../common/validation.js';

const TITLE_MESSAGE = 'title must be 1-255 characters';

export class CreateChecklistItemDto implements CreateChecklistItemInput {
  @Trim() @IsString() @Length(1, 255, { message: TITLE_MESSAGE }) title!: string;
}

export class UpdateChecklistItemDto implements UpdateChecklistItemInput {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @Length(1, 255, { message: TITLE_MESSAGE })
  title?: string;
  @IsOptionalNonNull() @IsBoolean({ message: 'isDone must be a boolean' }) isDone?: boolean;

  @IsOptionalNonNull()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'position must be a number' })
  position?: number;
}
