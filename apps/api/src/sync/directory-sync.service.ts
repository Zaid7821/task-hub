import {
  AuditAction,
  type DirectorySyncRunDto,
  type DirectorySyncStatusDto,
  type DirectorySyncTrigger,
} from '@aionos/shared';
import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GraphDirectoryClient, GraphRequestError } from './graph-directory.client.js';
import { planSync, UnsafeSyncError, type SyncPlan, type UserFields } from './sync-plan.js';

/** Arbitrary constant key for pg_try_advisory_xact_lock: one sync at a time across all API instances. */
const SYNC_LOCK_KEY = 4_216_001;
const MAX_SKIPS_REPORTED = 50;
const TX_TIMEOUT_MS = 10 * 60_000;

type Counts = Pick<
  DirectorySyncRunDto,
  | 'fetched'
  | 'created'
  | 'updated'
  | 'unchanged'
  | 'deactivated'
  | 'reactivated'
  | 'departmentsCreated'
  | 'skipped'
  | 'skippedCount'
>;

const EMPTY_COUNTS: Counts = {
  fetched: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  deactivated: 0,
  reactivated: 0,
  departmentsCreated: 0,
  skipped: [],
  skippedCount: 0,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Imports people, departments and reporting lines from Microsoft Graph. Graph is the source of
 * truth for name, email, job title, employee ID, department, manager and active state; system
 * roles come from Entra app roles at sign-in and are never changed here.
 * TODO(phase-x): department heads and teams (not modelled in Graph; set manually for now).
 */
@Injectable()
export class DirectorySyncService {
  private readonly logger = new Logger(DirectorySyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: GraphDirectoryClient,
    private readonly audit: AuditService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get configured(): boolean {
    return this.graph.configured;
  }

  get intervalHours(): number {
    return this.config.get('GRAPH_SYNC_INTERVAL_HOURS', { infer: true });
  }

  /** Runs a sync. Throws 503 if not configured, 409 if one is already running, 422/502 on failure. */
  async run(trigger: DirectorySyncTrigger, actor: AuthUser | null): Promise<DirectorySyncRunDto> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Directory sync is not configured (GRAPH_SYNC_ENABLED / GRAPH_CLIENT_SECRET)',
      );
    }
    if (this.running) throw new ConflictException('A directory sync is already running');
    this.running = true;
    const startedAt = new Date();
    try {
      const graphUsers = await this.graph.listUsers();
      const counts = await this.prisma.$transaction(
        async (tx) => {
          const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(${SYNC_LOCK_KEY}) AS locked`;
          if (!locked) throw new ConflictException('A directory sync is already running');

          const [dbUsers, departments] = await Promise.all([
            tx.user.findMany({
              select: {
                id: true,
                entraObjectId: true,
                email: true,
                displayName: true,
                jobTitle: true,
                employeeCode: true,
                departmentId: true,
                managerId: true,
                isActive: true,
                lastSyncedAt: true,
              },
            }),
            tx.department.findMany({ select: { id: true, name: true } }),
          ]);
          const plan = planSync(graphUsers, dbUsers, departments);
          const result = await this.apply(tx, plan, startedAt);
          await this.audit.record(
            {
              actorId: actor?.id ?? null,
              action: AuditAction.DIRECTORY_SYNC_COMPLETED,
              entityType: 'System',
              entityId: 'directory-sync',
              metadata: this.metadata(trigger, startedAt, new Date(), result, null),
            },
            tx,
          );
          return result;
        },
        { timeout: TX_TIMEOUT_MS, maxWait: 10_000 },
      );
      // Read back what was audited, so the response matches what the status endpoint shows.
      const run =
        (await this.lastRun()) ?? this.toRun(trigger, startedAt, new Date(), counts, null, actor);
      this.logger.log(
        `Directory sync ${trigger}: ${counts.fetched} read, ${counts.created} created, ` +
          `${counts.updated} updated, ${counts.deactivated} deactivated, ${counts.skippedCount} skipped`,
      );
      return run;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      const message =
        error instanceof UnsafeSyncError || error instanceof GraphRequestError
          ? error.message
          : 'Unexpected error during directory sync; see the API logs';
      this.logger.error(`Directory sync ${trigger} failed: ${String(error)}`);
      await this.audit.record({
        actorId: actor?.id ?? null,
        action: AuditAction.DIRECTORY_SYNC_FAILED,
        entityType: 'System',
        entityId: 'directory-sync',
        metadata: this.metadata(trigger, startedAt, new Date(), EMPTY_COUNTS, message),
      });
      if (error instanceof UnsafeSyncError) throw new UnprocessableEntityException(message);
      throw new BadGatewayException(message);
    } finally {
      this.running = false;
    }
  }

  private async apply(tx: Prisma.TransactionClient, plan: SyncPlan, now: Date): Promise<Counts> {
    const deptIds = new Map<string, string>();
    for (const d of await tx.department.findMany({ select: { id: true, name: true } })) {
      deptIds.set(d.name, d.id);
    }
    for (const name of plan.departmentsToCreate) {
      const created = await tx.department.create({ data: { name } });
      deptIds.set(name, created.id);
    }
    const deptId = (name: string | null) => (name ? (deptIds.get(name) ?? null) : null);

    for (const c of plan.creates) {
      await tx.user.create({
        data: {
          entraObjectId: c.oid,
          email: c.fields.email,
          displayName: c.fields.displayName,
          jobTitle: c.fields.jobTitle,
          employeeCode: c.fields.employeeCode,
          departmentId: deptId(c.fields.departmentName),
          isActive: c.fields.isActive,
          lastSyncedAt: now,
        },
      });
    }

    // Managers are linked last, so a manager created in this run can be referenced.
    const idByOid = new Map(
      (await tx.user.findMany({ select: { id: true, entraObjectId: true } })).map((u) => [
        u.entraObjectId.toLowerCase(),
        u.id,
      ]),
    );
    const managerId = (oid: string | null | undefined) => (oid ? (idByOid.get(oid) ?? null) : null);

    for (const c of plan.creates) {
      const manager = managerId(c.fields.managerOid);
      if (manager) {
        await tx.user.update({ where: { entraObjectId: c.oid }, data: { managerId: manager } });
      }
    }
    for (const u of plan.updates) {
      await tx.user.update({
        where: { id: u.id },
        data: this.updateData(u.changes, deptId, managerId, now),
      });
    }
    if (plan.unchangedIds.length > 0) {
      await tx.user.updateMany({
        where: { id: { in: plan.unchangedIds } },
        data: { lastSyncedAt: now },
      });
    }
    if (plan.missingIds.length > 0) {
      await tx.user.updateMany({
        where: { id: { in: plan.missingIds } },
        data: { isActive: false },
      });
    }

    return {
      fetched: plan.fetched,
      created: plan.creates.length,
      updated: plan.updates.length,
      unchanged: plan.unchangedIds.length,
      deactivated: plan.deactivated,
      reactivated: plan.reactivated,
      departmentsCreated: plan.departmentsToCreate.length,
      skipped: plan.skipped.slice(0, MAX_SKIPS_REPORTED),
      skippedCount: plan.skipped.length,
    };
  }

  private updateData(
    changes: Partial<UserFields>,
    deptId: (name: string | null) => string | null,
    managerId: (oid: string | null | undefined) => string | null,
    now: Date,
  ): Prisma.UserUncheckedUpdateInput {
    return {
      email: changes.email,
      displayName: changes.displayName,
      jobTitle: changes.jobTitle,
      employeeCode: changes.employeeCode,
      isActive: changes.isActive,
      departmentId:
        changes.departmentName === undefined ? undefined : deptId(changes.departmentName),
      managerId: changes.managerOid === undefined ? undefined : managerId(changes.managerOid),
      lastSyncedAt: now,
    };
  }

  private metadata(
    trigger: DirectorySyncTrigger,
    startedAt: Date,
    finishedAt: Date,
    counts: Counts,
    error: string | null,
  ): Prisma.InputJsonObject {
    return {
      trigger,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      fetched: counts.fetched,
      created: counts.created,
      updated: counts.updated,
      unchanged: counts.unchanged,
      deactivated: counts.deactivated,
      reactivated: counts.reactivated,
      departmentsCreated: counts.departmentsCreated,
      skippedCount: counts.skippedCount,
      skipped: counts.skipped.map((s) => ({ email: s.email, reason: s.reason })),
      error,
    };
  }

  private toRun(
    trigger: DirectorySyncTrigger,
    startedAt: Date,
    finishedAt: Date,
    counts: Counts,
    error: string | null,
    actor: { id: string; displayName: string; email: string; jobTitle?: string | null } | null,
  ): DirectorySyncRunDto {
    return {
      trigger,
      outcome: error ? 'FAILED' : 'SUCCEEDED',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      triggeredBy: actor ? toUserSummary({ ...actor, jobTitle: actor.jobTitle ?? null }) : null,
      ...counts,
      error,
    };
  }

  /** Latest run, read back from the audit log so it survives restarts and spans instances. */
  async lastRun(): Promise<DirectorySyncRunDto | null> {
    const row = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'System',
        entityId: 'directory-sync',
        action: { in: [AuditAction.DIRECTORY_SYNC_COMPLETED, AuditAction.DIRECTORY_SYNC_FAILED] },
      },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: userSummarySelect } },
    });
    if (!row || !isRecord(row.metadata)) return null;
    const m = row.metadata;
    const num = (k: string) => (typeof m[k] === 'number' ? m[k] : 0);
    const text = (k: string) => (typeof m[k] === 'string' ? m[k] : null);
    const skipped = Array.isArray(m.skipped)
      ? m.skipped.flatMap((s) =>
          isRecord(s) && typeof s.email === 'string' && typeof s.reason === 'string'
            ? [{ email: s.email, reason: s.reason }]
            : [],
        )
      : [];
    return {
      trigger: text('trigger') === 'MANUAL' ? 'MANUAL' : 'SCHEDULED',
      outcome: row.action === AuditAction.DIRECTORY_SYNC_FAILED ? 'FAILED' : 'SUCCEEDED',
      startedAt: text('startedAt') ?? row.createdAt.toISOString(),
      finishedAt: text('finishedAt') ?? row.createdAt.toISOString(),
      triggeredBy: row.actor ? toUserSummary(row.actor) : null,
      fetched: num('fetched'),
      created: num('created'),
      updated: num('updated'),
      unchanged: num('unchanged'),
      deactivated: num('deactivated'),
      reactivated: num('reactivated'),
      departmentsCreated: num('departmentsCreated'),
      skipped,
      skippedCount: num('skippedCount'),
      error: text('error'),
    };
  }

  /** When the next scheduled run is due, or null when scheduling is off. */
  nextRunAt(lastRun: DirectorySyncRunDto | null): Date | null {
    if (!this.configured || this.intervalHours === 0) return null;
    if (!lastRun) return new Date();
    return new Date(new Date(lastRun.startedAt).getTime() + this.intervalHours * 3_600_000);
  }

  async status(): Promise<DirectorySyncStatusDto> {
    const lastRun = await this.lastRun();
    return {
      configured: this.configured,
      intervalHours: this.intervalHours,
      running: this.running,
      lastRun,
      nextRunAt: this.nextRunAt(lastRun)?.toISOString() ?? null,
    };
  }
}
