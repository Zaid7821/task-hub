import type { CommentDto, Paginated } from '@aionos/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CommentsService } from './comments.service.js';
import { CommentBodyDto, CommentQueryDto } from './dto/comment.dto.js';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('tasks/:taskId/comments')
  list(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: CommentQueryDto,
  ): Promise<Paginated<CommentDto>> {
    return this.comments.list(user, taskId, query);
  }

  @Post('tasks/:taskId/comments')
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: CommentBodyDto,
  ): Promise<CommentDto> {
    return this.comments.create(user, taskId, body);
  }

  @Patch('comments/:commentId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() body: CommentBodyDto,
  ): Promise<CommentDto> {
    return this.comments.update(user, commentId, body);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<void> {
    return this.comments.remove(user, commentId);
  }
}
