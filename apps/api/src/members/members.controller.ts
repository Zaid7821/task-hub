import type { Paginated, ProjectMemberDto } from '@aionos/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ProjectAccess } from '../common/decorators/project-access.decorator.js';
import { ProjectCtx } from '../common/decorators/project-context.decorator.js';
import type { ProjectAccessContext } from '../common/guards/project-access.guard.js';
import { AddMemberDto, MemberQueryDto, UpdateMemberDto } from './dto/member.dto.js';
import { MembersService } from './members.service.js';

@ApiTags('members')
@Controller('projects/:projectId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @ProjectAccess('view')
  list(
    @ProjectCtx() { project }: ProjectAccessContext,
    @Query() query: MemberQueryDto,
  ): Promise<Paginated<ProjectMemberDto>> {
    return this.members.list(project, query);
  }

  @Post()
  @ProjectAccess('manage-members')
  add(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project }: ProjectAccessContext,
    @Body() body: AddMemberDto,
    @Ip() ip: string,
  ): Promise<ProjectMemberDto> {
    return this.members.add(user, project, body, ip);
  }

  @Patch(':userId')
  @ProjectAccess('manage-members')
  updateRole(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project }: ProjectAccessContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateMemberDto,
    @Ip() ip: string,
  ): Promise<ProjectMemberDto> {
    return this.members.updateRole(user, project, userId, body, ip);
  }

  @Delete(':userId')
  @HttpCode(204)
  @ProjectAccess('manage-members')
  remove(
    @CurrentUser() user: AuthUser,
    @ProjectCtx() { project }: ProjectAccessContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Ip() ip: string,
  ): Promise<void> {
    return this.members.remove(user, project, userId, ip);
  }
}
