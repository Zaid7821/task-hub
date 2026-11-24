import { ProjectMemberRole, type ProjectDto, type UserDto } from '@aionos/shared';
import { CheckIcon, Loader2Icon, UserPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAddProjectMember } from '@/api/members';
import { useUsers } from '@/api/users';
import { SearchInput } from '@/components/common/SearchInput';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { projectMemberRoleLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

type AddableRole = typeof ProjectMemberRole.MEMBER | typeof ProjectMemberRole.VIEWER;

interface AddMemberDialogProps {
  project: ProjectDto;
  existingUserIds: Set<string>;
}

export function AddMemberDialog({ project, existingUserIds }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add member to {project.key}</DialogTitle>
          <DialogDescription>Search for anyone in AIonOS.</DialogDescription>
        </DialogHeader>
        {open && (
          <AddMemberForm
            project={project}
            existingUserIds={existingUserIds}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddMemberForm({
  project,
  existingUserIds,
  onDone,
}: AddMemberDialogProps & { onDone: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserDto | null>(null);
  const [role, setRole] = useState<AddableRole>(ProjectMemberRole.MEMBER);
  const users = useUsers({ search: search || undefined, isActive: true, pageSize: 8 });
  const addMember = useAddProjectMember(project.id);

  const submit = () => {
    if (!selected) return;
    addMember.mutate(
      { userId: selected.id, role },
      {
        onSuccess: () => {
          toast.success(`${selected.displayName} added to ${project.key}`);
          onDone();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <SearchInput
        value=""
        onCommit={setSearch}
        placeholder="Search by name or email"
        label="Search people"
      />

      <ul className="max-h-64 space-y-1 overflow-y-auto" aria-label="Search results">
        {users.isPending &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-11 w-full" />
            </li>
          ))}
        {users.isError && (
          <li>
            <FieldError>Could not search people: {users.error.message}</FieldError>
          </li>
        )}
        {users.data?.data.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">No people found.</li>
        )}
        {users.data?.data.map((u) => {
          const isMember = existingUserIds.has(u.id);
          const isSelected = selected?.id === u.id;
          return (
            <li key={u.id}>
              <button
                type="button"
                disabled={isMember}
                aria-pressed={isSelected}
                onClick={() => setSelected(u)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60',
                  isSelected && 'bg-primary/10 ring-1 ring-primary/40',
                )}
              >
                <UserAvatar user={u} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.displayName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[u.jobTitle, u.department?.name].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {isMember ? (
                  <span className="text-xs text-muted-foreground">Already a member</span>
                ) : (
                  isSelected && <CheckIcon className="size-4 text-primary" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <FieldLabel htmlFor="member-role">Role</FieldLabel>
        <Select value={role} onValueChange={(v) => setRole(v as AddableRole)}>
          <SelectTrigger id="member-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ProjectMemberRole.MEMBER}>
              {projectMemberRoleLabel.MEMBER} — can create and edit tasks
            </SelectItem>
            <SelectItem value={ProjectMemberRole.VIEWER}>
              {projectMemberRoleLabel.VIEWER} — read-only
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {addMember.isError && <FieldError>{addMember.error.message}</FieldError>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" disabled={!selected || addMember.isPending} onClick={submit}>
          {addMember.isPending && <Loader2Icon className="animate-spin" />}
          {selected ? `Add ${selected.displayName.split(' ')[0] ?? ''}` : 'Add member'}
        </Button>
      </DialogFooter>
    </div>
  );
}
