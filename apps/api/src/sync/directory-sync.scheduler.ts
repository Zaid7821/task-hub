import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { DirectorySyncService } from './directory-sync.service.js';

const CHECK_EVERY_MS = 5 * 60_000;

/**
 * Starts a scheduled sync when one is due. "Due" is computed from the last run in the audit log,
 * so restarts don't trigger extra runs and several API instances share one schedule (the DB lock
 * lets only one of them run).
 */
@Injectable()
export class DirectorySyncScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DirectorySyncScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly sync: DirectorySyncService) {}

  onApplicationBootstrap(): void {
    if (!this.sync.configured || this.sync.intervalHours === 0) {
      this.logger.log('Scheduled directory sync is off');
      return;
    }
    this.logger.log(`Scheduled directory sync every ${this.sync.intervalHours} h`);
    this.timer = setInterval(() => void this.tick(), CHECK_EVERY_MS);
    // Never keep the process alive just for the schedule.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    try {
      const next = this.sync.nextRunAt(await this.sync.lastRun());
      if (next && next.getTime() <= Date.now()) await this.sync.run('SCHEDULED', null);
    } catch {
      // Failures are logged and written to the audit log by DirectorySyncService.
    }
  }
}
