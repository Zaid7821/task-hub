// Pure diff between Graph and the database. No I/O, so every rule is unit-testable.
import type { DirectorySyncSkip } from '@aionos/shared';
import type { GraphUser } from './graph-directory.client.js';

export interface DbUser {
  id: string;
  entraObjectId: string;
  email: string;
  displayName: string;
  jobTitle: string | null;
  employeeCode: string | null;
  departmentId: string | null;
  managerId: string | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
}

export interface DbDepartment {
  id: string;
  name: string;
}

/** Desired values for a user. Departments and managers are referenced by name / Entra oid. */
export interface UserFields {
  email: string;
  displayName: string;
  jobTitle: string | null;
  employeeCode: string | null;
  departmentName: string | null;
  managerOid: string | null;
  isActive: boolean;
}

export interface UserCreate {
  oid: string;
  fields: UserFields;
}

export interface UserUpdate {
  id: string;
  oid: string;
  /** Only the fields that differ from the database. */
  changes: Partial<UserFields>;
}

export interface SyncPlan {
  /** Member accounts considered (guests and unusable rows excluded). */
  fetched: number;
  departmentsToCreate: string[];
  creates: UserCreate[];
  updates: UserUpdate[];
  /** Users matched in Graph with nothing to change (still stamped as synced). */
  unchangedIds: string[];
  /** Previously synced users no longer in Graph: deactivated, never deleted. */
  missingIds: string[];
  deactivated: number;
  reactivated: number;
  skipped: DirectorySyncSkip[];
}

/** Refuse runs that would switch off more than this share of active users (bad filter, outage). */
export const MAX_DEACTIVATION_SHARE = 0.2;
/** Small directories may legitimately lose a few people at once. */
export const DEACTIVATION_ALWAYS_ALLOWED = 10;

export class UnsafeSyncError extends Error {}

const norm = (s: string) => s.trim().toLowerCase();

function desiredFields(g: GraphUser, email: string): UserFields {
  return {
    email,
    displayName: g.displayName?.trim() || email,
    jobTitle: g.jobTitle?.trim().slice(0, 200) || null,
    employeeCode: g.employeeId?.trim().slice(0, 50) || null,
    departmentName: g.department?.trim().slice(0, 120) || null,
    managerOid: g.managerId && g.managerId !== g.id ? g.managerId.toLowerCase() : null,
    isActive: g.accountEnabled,
  };
}

export function planSync(
  graphUsers: GraphUser[],
  dbUsers: DbUser[],
  departments: DbDepartment[],
): SyncPlan {
  const skipped: DirectorySyncSkip[] = [];
  const members = graphUsers.filter((g) => g.userType === null || g.userType === 'Member');
  if (members.length === 0) {
    throw new UnsafeSyncError('Graph returned no member accounts; nothing was changed');
  }

  const byOid = new Map(dbUsers.map((u) => [u.entraObjectId.toLowerCase(), u]));
  const byEmail = new Map(dbUsers.map((u) => [u.email, u]));
  const byEmployeeCode = new Map(
    dbUsers.flatMap((u) => (u.employeeCode ? [[u.employeeCode, u] as const] : [])),
  );
  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));
  const deptByName = new Map(departments.map((d) => [norm(d.name), d.name]));
  const oidById = new Map(dbUsers.map((u) => [u.id, u.entraObjectId.toLowerCase()]));

  const seenOids = new Set<string>();
  const claimedEmails = new Set<string>();
  const claimedCodes = new Set<string>();
  const newDepartments = new Map<string, string>();
  const creates: UserCreate[] = [];
  const updates: UserUpdate[] = [];
  const unchangedIds: string[] = [];
  let deactivated = 0;
  let reactivated = 0;

  for (const g of members) {
    const oid = g.id.toLowerCase();
    const email = norm(g.mail ?? g.userPrincipalName);
    if (seenOids.has(oid)) continue;
    seenOids.add(oid);
    const existing = byOid.get(oid);

    // An email owned by a different identity is never silently re-linked (account takeover risk).
    const emailOwner = byEmail.get(email);
    if (
      (emailOwner && emailOwner.entraObjectId.toLowerCase() !== oid) ||
      claimedEmails.has(email)
    ) {
      skipped.push({ email, reason: 'Email is already used by a different Entra account' });
      continue;
    }
    claimedEmails.add(email);

    const fields = desiredFields(g, email);
    if (fields.employeeCode) {
      const owner = byEmployeeCode.get(fields.employeeCode);
      if (
        (owner && owner.entraObjectId.toLowerCase() !== oid) ||
        claimedCodes.has(fields.employeeCode)
      ) {
        skipped.push({
          email,
          reason: `Employee ID ${fields.employeeCode} is already used by another user; left unchanged`,
        });
        fields.employeeCode = existing?.employeeCode ?? null;
      }
      if (fields.employeeCode) claimedCodes.add(fields.employeeCode);
    }

    if (fields.departmentName) {
      const known = deptByName.get(norm(fields.departmentName));
      if (known) fields.departmentName = known;
      else {
        const pending = newDepartments.get(norm(fields.departmentName));
        if (pending) fields.departmentName = pending;
        else newDepartments.set(norm(fields.departmentName), fields.departmentName);
      }
    }

    if (!existing) {
      creates.push({ oid, fields });
      continue;
    }

    const current: UserFields = {
      email: existing.email,
      displayName: existing.displayName,
      jobTitle: existing.jobTitle,
      employeeCode: existing.employeeCode,
      departmentName: existing.departmentId
        ? (deptNameById.get(existing.departmentId) ?? null)
        : null,
      managerOid: existing.managerId ? (oidById.get(existing.managerId) ?? null) : null,
      isActive: existing.isActive,
    };
    const changes: Partial<UserFields> = {};
    for (const key of Object.keys(fields) as (keyof UserFields)[]) {
      if (fields[key] !== current[key]) Object.assign(changes, { [key]: fields[key] });
    }
    if (changes.isActive === false) deactivated += 1;
    if (changes.isActive === true) reactivated += 1;
    if (Object.keys(changes).length === 0) unchangedIds.push(existing.id);
    else updates.push({ id: existing.id, oid, changes });
  }

  // Only users that came from Graph before are switched off: seed/dev accounts are left alone.
  const missingIds = dbUsers
    .filter(
      (u) => u.lastSyncedAt !== null && u.isActive && !seenOids.has(u.entraObjectId.toLowerCase()),
    )
    .map((u) => u.id);
  deactivated += missingIds.length;

  const activeNow = dbUsers.filter((u) => u.isActive).length;
  if (
    deactivated > DEACTIVATION_ALWAYS_ALLOWED &&
    deactivated > activeNow * MAX_DEACTIVATION_SHARE
  ) {
    throw new UnsafeSyncError(
      `This run would deactivate ${deactivated} of ${activeNow} active users, more than ` +
        `${MAX_DEACTIVATION_SHARE * 100}%. Nothing was changed; check the Graph permissions and data.`,
    );
  }

  return {
    fetched: members.length,
    departmentsToCreate: [...newDepartments.values()],
    creates,
    updates,
    unchangedIds,
    missingIds,
    deactivated,
    reactivated,
    skipped,
  };
}
