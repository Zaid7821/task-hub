import type { DirectorySyncRunDto, DirectorySyncStatusDto } from '@aionos/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SystemRole } from '../generated/prisma/enums.js';
import { DirectorySyncService } from './directory-sync.service.js';

@ApiTags('admin')
@Controller('admin/directory-sync')
@Roles(SystemRole.SUPER_ADMIN)
export class DirectorySyncController {
  constructor(private readonly sync: DirectorySyncService) {}

  @Get()
  @ApiOperation({ summary: 'Directory sync status and last run (SUPER_ADMIN)' })
  status(): Promise<DirectorySyncStatusDto> {
    return this.sync.status();
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Sync users from Microsoft Graph now (SUPER_ADMIN)' })
  run(@CurrentUser() user: AuthUser): Promise<DirectorySyncRunDto> {
    return this.sync.run('MANUAL', user);
  }
}
