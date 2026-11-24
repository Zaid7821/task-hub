import type { TimesheetSummaryDto, TimesheetWeekDto } from '@aionos/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  ApprovalQueryDto,
  SubmitTimesheetDto,
  TimesheetDecisionDto,
  WeekQueryDto,
} from './dto/timesheet.dto.js';
import { TimesheetsService } from './timesheets.service.js';

@ApiTags('timesheets')
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheets: TimesheetsService) {}

  @Get('me')
  @ApiOperation({ summary: "The caller's week (defaults to the current week)" })
  me(@CurrentUser() user: AuthUser, @Query() query: WeekQueryDto): Promise<TimesheetWeekDto> {
    return this.timesheets.myWeek(user, query.weekStart);
  }

  @Post('me/submit')
  @HttpCode(200)
  submit(
    @CurrentUser() user: AuthUser,
    @Body() body: SubmitTimesheetDto,
  ): Promise<TimesheetWeekDto> {
    return this.timesheets.submit(user, body.weekStart);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'Weeks assigned to the caller for approval (default: SUBMITTED)' })
  approvals(
    @CurrentUser() user: AuthUser,
    @Query() query: ApprovalQueryDto,
  ): Promise<TimesheetSummaryDto[]> {
    return this.timesheets.approvals(user, query.status);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TimesheetWeekDto> {
    return this.timesheets.getById(user, id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TimesheetDecisionDto,
    @Ip() ip: string,
  ): Promise<TimesheetWeekDto> {
    return this.timesheets.decide(user, id, 'approve', body.note, ip);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TimesheetDecisionDto,
    @Ip() ip: string,
  ): Promise<TimesheetWeekDto> {
    return this.timesheets.decide(user, id, 'reject', body.note, ip);
  }
}
