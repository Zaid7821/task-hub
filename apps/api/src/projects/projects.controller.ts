import type { Paginated, ProjectDto } from '@aionos/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ProjectAccess } from '../common/decorators/project-access.decorator.js';
import { ProjectCtx } from '../common/decorators/project-context.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { ProjectAccessContext } from '../common/guards/project-access.guard.js';
import { SystemRole } from '../generated/prisma/enums.js';
import { CreateProjectDto, ProjectQueryDto, UpdateProjectDto } from './dto/project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Projects visible to the caller' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ProjectQueryDto,
  ): Promise<Paginated<ProjectDto>> {
    return this.projects.list(user, query);
  }

  @Get('by-key/:key')
  byKey(@CurrentUser() user: AuthUser, @Param('key') key: string): Promise<ProjectDto> {
    return this.projects.getByKey(user, key);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project (MANAGER and above); the creator becomes OWNER' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateProjectDto,
    @Ip() ip: string,
  ): Promise<ProjectDto> {
    return this.projects.create(user, body, ip);
  }

  @Patch(':projectId')
  @ProjectAccess('manage-members')
  @ApiOperation({ summary: 'Edit a project; status ARCHIVED is the normal "delete"' })
  update(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project }: ProjectAccessContext,
    @Body() body: UpdateProjectDto,
    @Ip() ip: string,
  ): Promise<ProjectDto> {
    return this.projects.update(user, project, body, ip);
  }

  @Delete(':projectId')
  @HttpCode(204)
  @Roles(SystemRole.SUPER_ADMIN)
  @ProjectAccess('view')
  @ApiOperation({ summary: 'Hard delete (SUPER_ADMIN, only projects without tasks)' })
  remove(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project }: ProjectAccessContext,
    @Ip() ip: string,
  ): Promise<void> {
    return this.projects.remove(user, project, ip);
  }
}
