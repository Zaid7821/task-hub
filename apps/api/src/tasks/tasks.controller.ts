import type { BoardDto, Paginated, TaskActivityDto, TaskDto } from '@aionos/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ProjectAccess } from '../common/decorators/project-access.decorator.js';
import { ProjectCtx } from '../common/decorators/project-context.decorator.js';
import type { ProjectAccessContext } from '../common/guards/project-access.guard.js';
import {
  ActivityQueryDto,
  ChangeStatusDto,
  CreateTaskDto,
  ReassignDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/task.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Tasks across all projects visible to the caller' })
  list(@CurrentUser() user: AuthUser, @Query() query: TaskQueryDto): Promise<Paginated<TaskDto>> {
    return this.tasks.list(user, query);
  }

  @Get('tasks/by-key/:key')
  byKey(@CurrentUser() user: AuthUser, @Param('key') key: string): Promise<TaskDto> {
    return this.tasks.getByKey(user, key);
  }

  @Get('projects/:projectId/board')
  @ProjectAccess('view')
  board(@ProjectCtx() { project }: ProjectAccessContext): Promise<BoardDto> {
    return this.tasks.board(project);
  }

  @Post('projects/:projectId/tasks')
  @ProjectAccess('view')
  create(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project, memberRole }: ProjectAccessContext,
    @Body() body: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.create(user, project, memberRole, body);
  }

  @Patch('tasks/:taskId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.update(user, taskId, body);
  }

  @Patch('tasks/:taskId/status')
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: ChangeStatusDto,
  ): Promise<TaskDto> {
    return this.tasks.changeStatus(user, taskId, body);
  }

  @Patch('tasks/:taskId/assignee')
  reassign(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: ReassignDto,
  ): Promise<TaskDto> {
    return this.tasks.reassign(user, taskId, body);
  }

  @Get('tasks/:taskId/activity')
  activity(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: ActivityQueryDto,
  ): Promise<Paginated<TaskActivityDto>> {
    return this.tasks.activity(user, taskId, query);
  }
}
