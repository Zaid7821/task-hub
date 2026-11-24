import type { CreateLabelInput, SetTaskLabelsInput, UpdateLabelInput } from '@aionos/shared';
import { ArrayMaxSize, IsArray, IsEnum, IsString, IsUUID, Length } from 'class-validator';
import { IsOptionalNonNull, Trim } from '../../common/validation.js';
import { LabelColor } from '../../generated/prisma/enums.js';

const NAME_MESSAGE = 'name must be 1-40 characters';

export class CreateLabelDto implements CreateLabelInput {
  @Trim() @IsString() @Length(1, 40, { message: NAME_MESSAGE }) name!: string;
  @IsEnum(LabelColor, { message: 'color is invalid' }) color!: LabelColor;
}

export class UpdateLabelDto implements UpdateLabelInput {
  @IsOptionalNonNull() @Trim() @IsString() @Length(1, 40, { message: NAME_MESSAGE }) name?: string;
  @IsOptionalNonNull() @IsEnum(LabelColor, { message: 'color is invalid' }) color?: LabelColor;
}

export class SetTaskLabelsDto implements SetTaskLabelsInput {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true, message: 'labelIds must be labels of this project' })
  labelIds!: string[];
}
