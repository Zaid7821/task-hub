import type { NotificationDto, Paginated, UnreadCountDto } from '@aionos/shared';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto.js';
import { ToBoolean } from '../common/validation.js';
import { NotificationsService } from './notifications.service.js';

class NotificationListQueryDto extends PaginationQueryDto {
  @IsOptional() @ToBoolean() @IsBoolean() unreadOnly?: boolean;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountDto> {
    return this.notifications.unreadCount(user);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: NotificationListQueryDto,
  ): Promise<Paginated<NotificationDto>> {
    return this.notifications.list(user, query);
  }

  @Post('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notifications.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationDto> {
    return this.notifications.markRead(user, id);
  }
}
