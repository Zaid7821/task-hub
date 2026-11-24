import type { MyStatsDto } from '@aionos/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('me')
  @ApiOperation({ summary: "The caller's stats for the last 8 weeks" })
  me(@CurrentUser() user: AuthUser): Promise<MyStatsDto> {
    return this.dashboard.myStats(user);
  }
}
