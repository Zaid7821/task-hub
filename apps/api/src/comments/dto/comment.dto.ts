import type { CommentInput } from '@aionos/shared';
import { IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { Trim } from '../../common/validation.js';

export const MAX_COMMENT_LENGTH = 10_000;

export class CommentBodyDto implements CommentInput {
  @Trim()
  @IsString()
  @Length(1, MAX_COMMENT_LENGTH, { message: `body must be 1-${MAX_COMMENT_LENGTH} characters` })
  body!: string;
}

export class CommentQueryDto extends PaginationQueryDto {}
