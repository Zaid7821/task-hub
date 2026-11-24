import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ChecklistModule } from './checklist/checklist.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { LabelsModule } from './labels/labels.module.js';
import { SavedViewsModule } from './saved-views/saved-views.module.js';
import { TimeLogsModule } from './time-logs/time-logs.module.js';
import { TimesheetsModule } from './timesheets/timesheets.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthController } from './health/health.controller.js';
import { MembersModule } from './members/members.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OrgModule } from './org/org.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { SyncModule } from './sync/sync.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    UsersModule,
    OrgModule,
    ProjectsModule,
    MembersModule,
    TasksModule,
    LabelsModule,
    ChecklistModule,
    CommentsModule,
    TimeLogsModule,
    TimesheetsModule,
    SavedViewsModule,
    DashboardModule,
    SyncModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
