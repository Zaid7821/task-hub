import type { Paginated, TimeLogDto } from '@aionos/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateTimeLogDto, TimeLogQueryDto } from './dto/time-log.dto.js';
import { TimeLogsService } from './time-logs.service.js';

@ApiTags('time-logs')
@Controller()
export class TimeLogsController {
  constructor(private readonly timeLogs: TimeLogsService) {}

  @Get('tasks/:taskId/time-logs')
  list(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: TimeLogQueryDto,
  ): Promise<Paginated<TimeLogDto>> {
    return this.timeLogs.list(user, taskId, query);
  }

  @Post('tasks/:taskId/time-logs')
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: CreateTimeLogDto,
  ): Promise<TimeLogDto> {
    return this.timeLogs.create(user, taskId, body);
  }

  @Delete('time-logs/:logId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('logId', ParseUUIDPipe) logId: string,
  ): Promise<void> {
    return this.timeLogs.remove(user, logId);
  }
}
