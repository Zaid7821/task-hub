import type { LabelDto, TaskDto } from '@aionos/shared';
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
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ProjectAccess } from '../common/decorators/project-access.decorator.js';
import { ProjectCtx } from '../common/decorators/project-context.decorator.js';
import type { ProjectAccessContext } from '../common/guards/project-access.guard.js';
import { CreateLabelDto, SetTaskLabelsDto, UpdateLabelDto } from './dto/label.dto.js';
import { LabelsService } from './labels.service.js';

@ApiTags('labels')
@Controller()
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get('projects/:projectId/labels')
  @ProjectAccess('view')
  list(@ProjectCtx() { project }: ProjectAccessContext): Promise<LabelDto[]> {
    return this.labels.list(project);
  }

  @Post('projects/:projectId/labels')
  @ProjectAccess('view')
  create(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project, memberRole }: ProjectAccessContext,
    @Body() body: CreateLabelDto,
  ): Promise<LabelDto> {
    return this.labels.create(user, project, memberRole, body);
  }

  @Patch('labels/:labelId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() body: UpdateLabelDto,
  ): Promise<LabelDto> {
    return this.labels.update(user, labelId, body);
  }

  @Delete('labels/:labelId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ): Promise<void> {
    return this.labels.remove(user, labelId);
  }

  @Put('tasks/:taskId/labels')
  setTaskLabels(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: SetTaskLabelsDto,
  ): Promise<TaskDto> {
    return this.labels.setTaskLabels(user, taskId, body);
  }
}
