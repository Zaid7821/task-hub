import { Module } from '@nestjs/common';
import { DirectorySyncController } from './directory-sync.controller.js';
import { DirectorySyncScheduler } from './directory-sync.scheduler.js';
import { DirectorySyncService } from './directory-sync.service.js';
import { GraphDirectoryClient } from './graph-directory.client.js';

@Module({
  controllers: [DirectorySyncController],
  providers: [GraphDirectoryClient, DirectorySyncService, DirectorySyncScheduler],
})
export class SyncModule {}
