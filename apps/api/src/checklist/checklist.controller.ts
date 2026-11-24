import type { ChecklistItemDto } from '@aionos/shared';
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ChecklistService } from './checklist.service.js';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist.dto.js';

@ApiTags('checklist')
@Controller()
export class ChecklistController {
  constructor(private readonly checklist: ChecklistService) {}

  @Get('tasks/:taskId/checklist')
  list(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<ChecklistItemDto[]> {
    return this.checklist.list(user, taskId);
  }

  @Post('tasks/:taskId/checklist')
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: CreateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    return this.checklist.create(user, taskId, body);
  }

  @Patch('checklist-items/:itemId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    return this.checklist.update(user, itemId, body);
  }

  @Delete('checklist-items/:itemId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.checklist.remove(user, itemId);
  }
}
