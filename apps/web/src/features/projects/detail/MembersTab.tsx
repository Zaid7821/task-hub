import { ProjectMemberRole, type ProjectMemberDto } from '@aionos/shared';
import { Trash2Icon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useProjectMembers, useRemoveProjectMember } from '@/api/members';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { toneBadgeClass } from '@/components/common/tones';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/dates';
import { projectMemberRoleLabel } from '@/lib/labels';
import { AddMemberDialog } from '../members/AddMemberDialog';
import { useProjectContext } from './project-context';

const ROLE_TONE = {
  [ProjectMemberRole.OWNER]: toneBadgeClass.brand,
  [ProjectMemberRole.MEMBER]: toneBadgeClass.neutral,
  [ProjectMemberRole.VIEWER]: toneBadgeClass.info,
};

export function MembersTab() {
  const { project, canManageMembers } = useProjectContext();
  const members = useProjectMembers(project.id);
  const removeMember = useRemoveProjectMember(project.id);
  const [toRemove, setToRemove] = useState<ProjectMemberDto | null>(null);

  if (members.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading members">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (members.isError) {
    return (
      <ErrorState
        title="Could not load members"
        error={members.error}
        onRetry={() => void members.refetch()}
      />
    );
  }

  const existingUserIds = new Set(members.data.map((m) => m.user.id));

  const confirmRemove = () => {
    if (!toRemove) return;
    const name = toRemove.user.displayName;
    removeMember.mutate(toRemove.user.id, {
      onSuccess: () => toast.success(`${name} removed from ${project.key}`),
    });
    setToRemove(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {members.data.length} {members.data.length === 1 ? 'member' : 'members'}
        </p>
        {canManageMembers && (
          <AddMemberDialog project={project} existingUserIds={existingUserIds} />
        )}
      </div>

      {members.data.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No members yet" />
      ) : (
        <ul className="divide-y rounded-xl border">
          {members.data.map((m) => (
            <li key={m.user.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar user={m.user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[m.user.jobTitle, m.user.email].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Joined {formatDate(m.createdAt.slice(0, 10))}
              </span>
              <Badge variant="outline" className={ROLE_TONE[m.role]}>
                {projectMemberRoleLabel[m.role]}
              </Badge>
              {canManageMembers && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${m.user.displayName}`}
                  disabled={m.role === ProjectMemberRole.OWNER || removeMember.isPending}
                  title={
                    m.role === ProjectMemberRole.OWNER ? 'The owner cannot be removed' : undefined
                  }
                  onClick={() => setToRemove(m)}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={`Remove ${toRemove?.user.displayName ?? 'member'}?`}
        description="They will lose access to this project unless it is visible to them another way. Their past tasks, comments and time logs are kept."
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
      />
    </div>
  );
}
