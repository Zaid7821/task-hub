import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({ imports: [TasksModule], controllers: [CommentsController], providers: [CommentsService] })
export class CommentsModule {}
