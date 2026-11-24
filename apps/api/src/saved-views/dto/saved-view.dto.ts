import type { CreateSavedViewInput } from '@aionos/shared';
import { IsString, Length, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation.js';

export class CreateSavedViewDto implements CreateSavedViewInput {
  @Trim() @IsString() @Length(1, 80, { message: 'name must be 1-80 characters' }) name!: string;

  // In-app paths only (no protocol, no "//host"), so a saved view can never redirect elsewhere.
  @IsString()
  @Matches(/^\/(?!\/)[A-Za-z0-9/_-]{0,199}$/, { message: 'path must be an app path' })
  path!: string;

  @IsString()
  @MaxLength(1000, {
    message: 'query must be a URL query string without "?" (max 1000 characters)',
  })
  @Matches(/^(?!\?)/, {
    message: 'query must be a URL query string without "?" (max 1000 characters)',
  })
  query!: string;
}
