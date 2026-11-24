import type { AuditLogDto, Paginated } from '@aionos/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto.js';
import { SystemRole } from '../generated/prisma/enums.js';
import { AuditService } from './audit.service.js';

class AuditLogListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(50) entityType?: string;
  @IsOptional() @IsString() @MaxLength(64) entityId?: string;
  @IsOptional() @IsString() @MaxLength(80) action?: string;
}

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'System audit log (SUPER_ADMIN)' })
  list(@Query() query: AuditLogListQueryDto): Promise<Paginated<AuditLogDto>> {
    return this.audit.list(query);
  }
}
