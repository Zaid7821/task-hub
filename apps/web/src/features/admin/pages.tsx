import type { DepartmentDto, TeamDto, UserDto, UserSummary } from '@aionos/shared';
import { useState } from 'react';
import { useDepartments, useTeams } from '@/api/org';
import { useUsers } from '@/api/users';
import { FilterSelect } from '@/components/common/FilterSelect';
import { PaginationBar } from '@/components/common/PaginationBar';
import { RoleBadge } from '@/components/common/RoleBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { toneBadgeClass } from '@/components/common/tones';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { useUrlParams } from '@/hooks/use-url-params';
import { formatDateTime } from '@/lib/dates';
import { AdminTable, type AdminColumn } from './AdminTable';

// Read-only for now: the org structure is synced from Microsoft Entra ID.
// TODO(phase-x): role changes and manual overrides (must write AuditLog entries).

function Person({ user }: { user: UserSummary | null }) {
  if (!user) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-2">
      <UserAvatar user={user} size="xs" />
      <span className="truncate">{user.displayName}</span>
    </span>
  );
}

const departmentColumns: AdminColumn<DepartmentDto>[] = [
  { header: 'Department', cell: (d) => <span className="font-medium">{d.name}</span> },
  { header: 'Head', cell: (d) => <Person user={d.head} /> },
  { header: 'Parent', cell: (d) => d.parentDepartment?.name ?? '—' },
  { header: 'Teams', cell: (d) => d.teamCount, className: 'text-right tabular-nums' },
  { header: 'People', cell: (d) => d.userCount, className: 'text-right tabular-nums' },
];

export function DepartmentsPage() {
  // TODO(phase-x): paginate if the org grows beyond 100 departments.
  const departments = useDepartments({ pageSize: 100 });
  return (
    <AdminTable
      label="departments"
      columns={departmentColumns}
      rows={departments.data?.data}
      rowKey={(d) => d.id}
      isPending={departments.isPending}
      error={departments.error}
      onRetry={() => void departments.refetch()}
      emptyTitle="No departments yet"
    />
  );
}

const teamColumns: AdminColumn<TeamDto>[] = [
  { header: 'Team', cell: (t) => <span className="font-medium">{t.name}</span> },
  { header: 'Department', cell: (t) => t.department.name },
  { header: 'Lead', cell: (t) => <Person user={t.lead} /> },
  { header: 'People', cell: (t) => t.memberCount, className: 'text-right tabular-nums' },
];

export function TeamsPage() {
  const { params, update } = useUrlParams<'department'>();
  const departmentId = params.get('department') ?? undefined;
  const departments = useDepartments({ pageSize: 100 });
  const teams = useTeams({ departmentId, pageSize: 100 });

  return (
    <div className="space-y-4">
      <FilterSelect
        label="Filter by department"
        value={departmentId}
        allLabel="All departments"
        options={(departments.data?.data ?? []).map((d): [string, string] => [d.id, d.name])}
        onChange={(v) => update({ department: v })}
        className="w-52"
      />
      <AdminTable
        label="teams"
        columns={teamColumns}
        rows={teams.data?.data}
        rowKey={(t) => t.id}
        isPending={teams.isPending}
        error={teams.error}
        onRetry={() => void teams.refetch()}
        emptyTitle="No teams in this department"
      />
    </div>
  );
}

const userColumns: AdminColumn<UserDto>[] = [
  {
    header: 'Name',
    cell: (u) => (
      <span className="flex items-center gap-2">
        <UserAvatar user={u} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{u.displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
        </span>
      </span>
    ),
  },
  { header: 'Job title', cell: (u) => u.jobTitle ?? '—' },
  { header: 'Department', cell: (u) => u.department?.name ?? '—' },
  { header: 'Team', cell: (u) => u.team?.name ?? '—' },
  { header: 'Manager', cell: (u) => <Person user={u.manager} /> },
  { header: 'Role', cell: (u) => <RoleBadge role={u.systemRole} /> },
  {
    header: 'Status',
    cell: (u) => (
      <Badge
        variant="outline"
        className={u.isActive ? toneBadgeClass.success : toneBadgeClass.neutral}
      >
        {u.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    header: 'Last synced',
    cell: (u) => (u.lastSyncedAt ? formatDateTime(u.lastSyncedAt) : 'Never'),
    className: 'text-xs text-muted-foreground whitespace-nowrap',
  },
];

export function UsersPage() {
  const { params, update, page } = useUrlParams<'q' | 'department'>();
  const [searchResets, setSearchResets] = useState(0);
  const search = params.get('q') ?? '';
  const departmentId = params.get('department') ?? undefined;
  const departments = useDepartments({ pageSize: 100 });
  const users = useUsers({
    search: search || undefined,
    departmentId,
    page,
    pageSize: 20,
  });
  const hasFilters = Boolean(search || departmentId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          key={searchResets}
          value={search}
          onCommit={(q) => update({ q })}
          placeholder="Search name, email or title"
          label="Search users"
          className="w-full sm:w-72"
        />
        <FilterSelect
          label="Filter by department"
          value={departmentId}
          allLabel="All departments"
          options={(departments.data?.data ?? []).map((d): [string, string] => [d.id, d.name])}
          onChange={(v) => update({ department: v })}
          className="w-52"
        />
        {hasFilters && (
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              update({ q: null, department: null });
              setSearchResets((n) => n + 1);
            }}
          >
            Clear
          </button>
        )}
      </div>
      <AdminTable
        label="users"
        columns={userColumns}
        rows={users.data?.data}
        rowKey={(u) => u.id}
        isPending={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
        emptyTitle={hasFilters ? 'No users match your filters' : 'No users yet'}
      />
      {users.data && (
        <PaginationBar
          meta={users.data.meta}
          isFetching={users.isFetching}
          onPageChange={(p) => update({ page: p > 1 ? String(p) : null })}
        />
      )}
    </div>
  );
}
