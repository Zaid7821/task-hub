import { LabelColor, type LabelDto, type TaskDto } from '@aionos/shared';
import { CheckIcon, PlusIcon, TagIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useLabelMutations, useProjectLabels, useSetTaskLabels } from '@/api/labels';
import { LabelList } from '@/components/common/LabelBadge';
import { LABEL_DOT } from '@/components/common/tones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LabelPickerProps {
  task: TaskDto;
  canEdit: boolean;
  canManage: boolean;
}

/** Toggle project labels on a task; project managers can also create labels inline. */
export function LabelPicker({ task, canEdit, canManage }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  if (!canEdit) {
    return task.labels.length > 0 ? <LabelList labels={task.labels} max={10} /> : <span>—</span>;
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="-mx-1 flex min-h-8 w-full max-w-72 flex-wrap items-center gap-1 rounded-md px-1 py-1 text-left hover:bg-accent"
          aria-label="Edit labels"
        >
          {task.labels.length > 0 ? (
            <LabelList labels={task.labels} max={10} />
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <TagIcon className="size-3.5" aria-hidden /> Add labels
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {open && <LabelPickerContent task={task} canManage={canManage} />}
      </PopoverContent>
    </Popover>
  );
}

function LabelPickerContent({ task, canManage }: { task: TaskDto; canManage: boolean }) {
  const labels = useProjectLabels(task.project.id);
  const setLabels = useSetTaskLabels();
  const selected = new Set(task.labels.map((l) => l.id));

  const toggle = (label: LabelDto) => {
    const next = selected.has(label.id)
      ? [...selected].filter((id) => id !== label.id)
      : [...selected, label.id];
    setLabels.mutate({ taskId: task.id, labelIds: next });
  };

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-medium text-muted-foreground">Labels in {task.project.key}</p>
      {labels.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : labels.isError ? (
        <p className="px-1 text-xs text-destructive">Could not load labels.</p>
      ) : labels.data.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          No labels yet{canManage ? '. Create the first one below.' : '.'}
        </p>
      ) : (
        <ul className="max-h-56 space-y-0.5 overflow-y-auto" aria-label="Project labels">
          {labels.data.map((label) => {
            const isOn = selected.has(label.id);
            return (
              <li key={label.id}>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isOn}
                  disabled={setLabels.isPending}
                  onClick={() => toggle(label)}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-accent disabled:opacity-60"
                >
                  <span
                    className={cn('size-2.5 rounded-full', LABEL_DOT[label.color])}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{label.name}</span>
                  {isOn && <CheckIcon className="size-4 text-primary" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {canManage && <CreateLabelForm projectId={task.project.id} onCreated={toggle} />}
    </div>
  );
}

const COLORS = Object.values(LabelColor);

function CreateLabelForm({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: (label: LabelDto) => void;
}) {
  const { create } = useLabelMutations(projectId);
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>(LabelColor.BLUE);

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), color },
      {
        onSuccess: (label) => {
          setName('');
          onCreated(label);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex gap-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={40}
          placeholder="New label"
          aria-label="New label name"
          className="h-8"
        />
        <Button
          size="icon-sm"
          className="size-8"
          onClick={submit}
          disabled={!name.trim() || create.isPending}
          aria-label="Create label"
        >
          <PlusIcon />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Label colour">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c.toLowerCase()}
            onClick={() => setColor(c)}
            className={cn(
              'size-5 rounded-full ring-offset-2 ring-offset-popover',
              LABEL_DOT[c],
              color === c && 'ring-2 ring-ring',
            )}
          />
        ))}
      </div>
    </div>
  );
}
