import { LabelColor, type LabelDto, type ProjectDto } from '@aionos/shared';
import { TagsIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useLabelMutations, useProjectLabels } from '@/api/labels';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LABEL_DOT } from '@/components/common/tones';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Project-level label management (rename, recolour, delete). Creating happens in the task picker too. */
export function ManageLabelsDialog({ project }: { project: ProjectDto }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <TagsIcon /> Labels
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Labels in {project.key}</DialogTitle>
          <DialogDescription>
            Renaming or recolouring updates every task. Deleting removes the label from its tasks.
          </DialogDescription>
        </DialogHeader>
        <LabelEditorList projectId={project.id} />
      </DialogContent>
    </Dialog>
  );
}

function LabelEditorList({ projectId }: { projectId: string }) {
  const labels = useProjectLabels(projectId);
  const mutations = useLabelMutations(projectId);
  const [toDelete, setToDelete] = useState<LabelDto | null>(null);
  const [newName, setNewName] = useState('');

  const create = () => {
    if (!newName.trim()) return;
    mutations.create.mutate(
      { name: newName.trim(), color: LabelColor.GRAY },
      { onSuccess: () => setNewName(''), onError: (e) => toast.error(e.message) },
    );
  };

  if (labels.isPending) return <Skeleton className="h-32 w-full" />;
  if (labels.isError) return <p className="text-sm text-destructive">Could not load labels.</p>;

  return (
    <div className="space-y-3">
      {labels.data.length === 0 && <p className="text-sm text-muted-foreground">No labels yet.</p>}
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {labels.data.map((label) => (
          <li key={label.id} className="flex items-center gap-2">
            <Select
              value={label.color}
              onValueChange={(color) =>
                mutations.update.mutate({ id: label.id, color: color as LabelColor })
              }
            >
              <SelectTrigger className="w-28" aria-label={`Colour of ${label.name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LabelColor).map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className={cn('size-2.5 rounded-full', LABEL_DOT[c])} aria-hidden />
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              defaultValue={label.name}
              maxLength={40}
              aria-label={`Name of ${label.name}`}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== label.name) {
                  mutations.update.mutate(
                    { id: label.id, name },
                    { onError: (err) => toast.error(err.message) },
                  );
                } else e.target.value = label.name;
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${label.name}`}
              onClick={() => setToDelete(label)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t pt-3">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          maxLength={40}
          placeholder="New label name"
          aria-label="New label name"
        />
        <Button onClick={create} disabled={!newName.trim() || mutations.create.isPending}>
          Add
        </Button>
      </div>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete label "${toDelete?.name ?? ''}"?`}
        description="It will be removed from every task in this project."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (toDelete) mutations.remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
