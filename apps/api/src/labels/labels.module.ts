import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { LabelsController } from './labels.controller.js';
import { LabelsService } from './labels.service.js';

@Module({ imports: [TasksModule], controllers: [LabelsController], providers: [LabelsService] })
export class LabelsModule {}
