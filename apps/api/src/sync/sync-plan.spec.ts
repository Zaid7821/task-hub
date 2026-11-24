import { describe, expect, it } from 'vitest';
import type { GraphUser } from './graph-directory.client.js';
import { parseGraphUser } from './graph-directory.client.js';
import { planSync, UnsafeSyncError, type DbDepartment, type DbUser } from './sync-plan.js';

const oid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const synced = new Date('2026-11-01T00:00:00Z');

function graph(n: number, extra: Partial<GraphUser> = {}): GraphUser {
  return {
    id: oid(n),
    mail: `User${n}@AIonOS.ai`,
    userPrincipalName: `user${n}@aionos.ai`,
    displayName: `User ${n}`,
    jobTitle: 'Engineer',
    department: 'Engineering',
    employeeId: `E${n}`,
    accountEnabled: true,
    userType: 'Member',
    managerId: null,
    ...extra,
  };
}

function db(n: number, extra: Partial<DbUser> = {}): DbUser {
  return {
    id: `db-${n}`,
    entraObjectId: oid(n),
    email: `user${n}@aionos.ai`,
    displayName: `User ${n}`,
    jobTitle: 'Engineer',
    employeeCode: `E${n}`,
    departmentId: 'dep-eng',
    managerId: null,
    isActive: true,
    lastSyncedAt: synced,
    ...extra,
  };
}

const departments: DbDepartment[] = [{ id: 'dep-eng', name: 'Engineering' }];

describe('planSync', () => {
  it('creates new users with lower-case email and new departments', () => {
    const plan = planSync([graph(1, { department: 'Finance' })], [], departments);
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0]?.fields.email).toBe('user1@aionos.ai');
    expect(plan.departmentsToCreate).toEqual(['Finance']);
  });

  it('matches departments case-insensitively and creates each new one once', () => {
    const plan = planSync(
      [
        graph(1, { department: 'engineering' }),
        graph(2, { department: 'Ops' }),
        graph(3, { department: 'OPS' }),
      ],
      [],
      departments,
    );
    expect(plan.departmentsToCreate).toEqual(['Ops']);
    expect(plan.creates.map((c) => c.fields.departmentName)).toEqual(['Engineering', 'Ops', 'Ops']);
  });

  it('reports unchanged users and only the changed fields of updated users', () => {
    const plan = planSync(
      [graph(1), graph(2, { jobTitle: 'Lead Engineer', managerId: oid(1) })],
      [db(1), db(2)],
      departments,
    );
    expect(plan.unchangedIds).toEqual(['db-1']);
    expect(plan.updates).toEqual([
      { id: 'db-2', oid: oid(2), changes: { jobTitle: 'Lead Engineer', managerOid: oid(1) } },
    ]);
  });

  it('skips guests', () => {
    const plan = planSync([graph(1), graph(2, { userType: 'Guest' })], [], departments);
    expect(plan.fetched).toBe(1);
    expect(plan.creates).toHaveLength(1);
  });

  it('never re-links an email that belongs to another identity', () => {
    const plan = planSync([graph(9, { mail: 'user1@aionos.ai' })], [db(1)], departments);
    expect(plan.creates).toHaveLength(0);
    expect(plan.skipped[0]?.reason).toMatch(/different Entra account/);
  });

  it('keeps the current employee code when the Graph value is taken by someone else', () => {
    const plan = planSync([graph(1), graph(2, { employeeId: 'E1' })], [db(1), db(2)], departments);
    expect(plan.updates).toEqual([]);
    expect(plan.skipped[0]?.reason).toMatch(/Employee ID E1/);
  });

  it('deactivates disabled accounts and previously synced users missing from Graph', () => {
    const plan = planSync(
      [graph(1, { accountEnabled: false }), graph(3)],
      [db(1), db(2), db(3, { isActive: false })],
      departments,
    );
    expect(plan.updates.find((u) => u.id === 'db-1')?.changes).toEqual({ isActive: false });
    expect(plan.updates.find((u) => u.id === 'db-3')?.changes).toEqual({ isActive: true });
    expect(plan.missingIds).toEqual(['db-2']);
    expect(plan.deactivated).toBe(2);
    expect(plan.reactivated).toBe(1);
  });

  it('leaves users that never came from Graph (seed / dev accounts) alone', () => {
    const plan = planSync([graph(1)], [db(1), db(50, { lastSyncedAt: null })], departments);
    expect(plan.missingIds).toEqual([]);
  });

  it('refuses a run that would deactivate too many people', () => {
    const many = Array.from({ length: 40 }, (_, i) => db(i + 1));
    expect(() => planSync([graph(1)], many, departments)).toThrow(UnsafeSyncError);
  });

  it('refuses an empty directory', () => {
    expect(() => planSync([], [db(1)], departments)).toThrow(UnsafeSyncError);
  });

  it('ignores a manager that points at the user themselves', () => {
    const plan = planSync([graph(1, { managerId: oid(1) })], [], departments);
    expect(plan.creates[0]?.fields.managerOid).toBeNull();
  });
});

describe('parseGraphUser', () => {
  it('reads the expanded manager id and rejects rows without id or UPN', () => {
    expect(
      parseGraphUser({
        id: oid(1),
        userPrincipalName: 'a@x.ai',
        accountEnabled: true,
        manager: { id: oid(2) },
      })?.managerId,
    ).toBe(oid(2));
    expect(parseGraphUser({ id: oid(1) })).toBeNull();
    expect(parseGraphUser('nope')).toBeNull();
  });
});
