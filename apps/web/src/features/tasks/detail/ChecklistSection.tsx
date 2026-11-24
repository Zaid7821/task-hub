import type { ChecklistItemDto } from '@aionos/shared';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useChecklist, useChecklistMutations } from '@/api/checklist';
import { ErrorState } from '@/components/common/ErrorState';
import { InlineEditText } from '@/components/common/InlineEditText';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ChecklistSection({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const checklist = useChecklist(taskId);
  const mutations = useChecklistMutations(taskId);
  const [newTitle, setNewTitle] = useState('');

  const add = () => {
    const title = newTitle.trim();
    if (!title) return;
    mutations.create.mutate(title, { onSuccess: () => setNewTitle('') });
  };

  const items = checklist.data ?? [];
  const done = items.filter((i) => i.isDone).length;

  return (
    <section aria-labelledby="task-checklist-heading" className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 id="task-checklist-heading" className="text-sm font-semibold">
          Checklist
        </h3>
        {items.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">
              {done}/{items.length}
            </span>
            <ProgressBar
              value={(done / items.length) * 100}
              label="Checklist progress"
              showValue={false}
              className="max-w-40 flex-1"
            />
          </>
        )}
      </div>

      {checklist.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : checklist.isError ? (
        <ErrorState
          title="Could not load the checklist"
          error={checklist.error}
          onRetry={() => void checklist.refetch()}
        />
      ) : (
        <>
          {items.length === 0 && !canEdit && (
            <p className="text-sm text-muted-foreground">No checklist.</p>
          )}
          <ul className="space-y-1" aria-label="Checklist items">
            {items.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                onToggle={(isDone) => mutations.update.mutate({ id: item.id, isDone })}
                onRename={(title) => mutations.update.mutateAsync({ id: item.id, title })}
                onDelete={() => mutations.remove.mutate(item.id)}
              />
            ))}
          </ul>
          {canEdit && (
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
                maxLength={255}
                placeholder="Add an item…"
                aria-label="New checklist item"
                className="h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={add}
                disabled={!newTitle.trim() || mutations.create.isPending}
              >
                <PlusIcon /> Add
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface ChecklistRowProps {
  item: ChecklistItemDto;
  canEdit: boolean;
  onToggle: (isDone: boolean) => void;
  onRename: (title: string) => Promise<unknown>;
  onDelete: () => void;
}

function ChecklistRow({ item, canEdit, onToggle, onRename, onDelete }: ChecklistRowProps) {
  const checkboxId = `checklist-${item.id}`;
  return (
    <li className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent/40">
      <Checkbox
        id={checkboxId}
        checked={item.isDone}
        disabled={!canEdit}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={`Mark "${item.title}" as ${item.isDone ? 'not done' : 'done'}`}
      />
      <div
        className={cn(
          'min-w-0 flex-1 text-sm',
          item.isDone && 'text-muted-foreground line-through',
        )}
      >
        <InlineEditText
          value={item.title}
          label="Checklist item"
          disabled={!canEdit}
          validate={(v) => (v.length === 0 ? 'Item cannot be empty' : null)}
          onSave={onRename}
        />
      </div>
      {item.doneBy && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {item.doneBy.displayName.split(' ')[0]}
        </span>
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Delete "${item.title}"`}
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  );
}
