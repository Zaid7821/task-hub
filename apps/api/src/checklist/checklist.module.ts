import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { ChecklistController } from './checklist.controller.js';
import { ChecklistService } from './checklist.service.js';

@Module({
  imports: [TasksModule],
  controllers: [ChecklistController],
  providers: [ChecklistService],
})
export class ChecklistModule {}
