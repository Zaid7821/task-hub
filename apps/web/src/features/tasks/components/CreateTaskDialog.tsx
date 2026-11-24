import { ProjectMemberRole, TaskPriority, TaskType, type ProjectDto } from '@aionos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon, PlusIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';
import { useProjectMembers } from '@/api/members';
import { useCreateTask } from '@/api/tasks';
import { PriorityBadge } from '@/components/common/PriorityBadge';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { taskTypeLabel } from '@/lib/labels';
import {
  NO_ESTIMATE,
  STORY_POINTS,
  UNASSIGNED,
  createTaskDefaults,
  createTaskSchema,
  toCreateTaskInput,
  type CreateTaskFormValues,
} from '../task-form';

export function CreateTaskDialog({ project }: { project: ProjectDto }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Create task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task in {project.key}</DialogTitle>
          <DialogDescription>New tasks start in To Do.</DialogDescription>
        </DialogHeader>
        {open && <CreateTaskForm project={project} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

interface SelectFieldProps {
  control: Control<CreateTaskFormValues>;
  name: FieldPath<CreateTaskFormValues>;
  id: string;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}

function SelectField({ control, name, id, label, disabled, children }: SelectFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{children}</SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

function CreateTaskForm({ project, onDone }: { project: ProjectDto; onDone: () => void }) {
  const members = useProjectMembers(project.id);
  const createTask = useCreateTask(project.id);
  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: createTaskDefaults,
  });
  const { errors, isSubmitting } = form.formState;
  const assignable = (members.data ?? []).filter((m) => m.role !== ProjectMemberRole.VIEWER);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const task = await createTask.mutateAsync(toCreateTaskInput(values));
      toast.success(`${task.key} created`, { description: task.title });
      onDone();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Could not create task',
      });
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="task-title">Title</FieldLabel>
          <Input
            id="task-title"
            autoFocus
            aria-invalid={Boolean(errors.title)}
            {...form.register('title')}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="task-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea id="task-description" rows={4} {...form.register('description')} />
          <FieldError errors={[errors.description]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField control={form.control} name="type" id="task-type" label="Type">
            {Object.values(TaskType).map((t) => (
              <SelectItem key={t} value={t}>
                {taskTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectField>
          <SelectField control={form.control} name="priority" id="task-priority" label="Priority">
            {Object.values(TaskPriority).map((p) => (
              <SelectItem key={p} value={p}>
                <PriorityBadge priority={p} />
              </SelectItem>
            ))}
          </SelectField>
        </div>

        <SelectField
          control={form.control}
          name="assigneeId"
          id="task-assignee"
          label="Assignee"
          disabled={members.isPending}
        >
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          <SelectSeparator />
          {assignable.map((m) => (
            <SelectItem key={m.user.id} value={m.user.id}>
              {m.user.displayName}
            </SelectItem>
          ))}
        </SelectField>
        {members.isError && <FieldError>Could not load project members.</FieldError>}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="estimatePoints"
            id="task-points"
            label="Estimate (points)"
          >
            <SelectItem value={NO_ESTIMATE}>No estimate</SelectItem>
            <SelectSeparator />
            {STORY_POINTS.map((p) => (
              <SelectItem key={p} value={String(p)}>
                {p} {p === 1 ? 'point' : 'points'}
              </SelectItem>
            ))}
          </SelectField>
          <Field>
            <FieldLabel htmlFor="task-due">Due date</FieldLabel>
            <Input id="task-due" type="date" {...form.register('dueDate')} />
          </Field>
        </div>

        {errors.root && <FieldError>{errors.root.message}</FieldError>}
      </FieldGroup>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          Create task
        </Button>
      </DialogFooter>
    </form>
  );
}
