import type { DepartmentDto, Paginated, TeamDto } from '@aionos/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DepartmentQueryDto, TeamQueryDto } from './dto/org-query.dto.js';
import { OrgService } from './org.service.js';

@ApiTags('org')
@Controller()
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get('departments')
  departments(@Query() query: DepartmentQueryDto): Promise<Paginated<DepartmentDto>> {
    return this.org.listDepartments(query);
  }

  @Get('teams')
  teams(@Query() query: TeamQueryDto): Promise<Paginated<TeamDto>> {
    return this.org.listTeams(query);
  }
}
