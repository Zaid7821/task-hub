import { Module } from '@nestjs/common';
import { TaskAccessService } from './task-access.service.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TaskAccessService],
  exports: [TaskAccessService],
})
export class TasksModule {}
