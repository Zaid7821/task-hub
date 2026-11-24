import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { TimeLogsController } from './time-logs.controller.js';
import { TimeLogsService } from './time-logs.service.js';

@Module({ imports: [TasksModule], controllers: [TimeLogsController], providers: [TimeLogsService] })
export class TimeLogsModule {}
