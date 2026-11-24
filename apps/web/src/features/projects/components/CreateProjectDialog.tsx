import { ProjectVisibility } from '@aionos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { useDepartments } from '@/api/org';
import { useCreateProject } from '@/api/projects';
import { useCurrentUser } from '@/auth/auth-context';
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { projectVisibilityLabel } from '@/lib/labels';
import {
  createProjectSchema,
  suggestProjectKey,
  toCreateProjectInput,
  type CreateProjectFormValues,
} from '../project-form';

const VISIBILITY_HELP: Record<ProjectVisibility, string> = {
  PUBLIC: 'Everyone in AIonOS can view it.',
  DEPARTMENT: 'Everyone in the selected department can view it.',
  PRIVATE: 'Only project members can view it.',
};

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> New project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            You will be the project owner and can add members afterwards.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form resets every time the dialog opens. */}
        {open && <CreateProjectForm onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectForm({ onDone }: { onDone: () => void }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const departments = useDepartments({ pageSize: 100 });
  const createProject = useCreateProject();

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      departmentId: user.department?.id ?? '',
      visibility: ProjectVisibility.DEPARTMENT,
      startDate: '',
      endDate: '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const keyPreview = useWatch({ control: form.control, name: 'key' });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const project = await createProject.mutateAsync(toCreateProjectInput(values));
      toast.success(`Project ${project.key} created`);
      onDone();
      void navigate(`/projects/${project.key}/board`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        form.setError('key', { message: error.message });
      } else {
        form.setError('root', {
          message: error instanceof Error ? error.message : 'Could not create project',
        });
      }
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="project-name">Name</FieldLabel>
          <Input
            id="project-name"
            autoFocus
            aria-invalid={Boolean(errors.name)}
            {...form.register('name', {
              // Suggest a key from the name until the user edits the key themselves.
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (!form.getFieldState('key').isDirty) {
                  form.setValue('key', suggestProjectKey(e.target.value));
                }
              },
            })}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field data-invalid={Boolean(errors.key)}>
            <FieldLabel htmlFor="project-key">Key</FieldLabel>
            <Input
              id="project-key"
              className="font-mono uppercase"
              maxLength={10}
              aria-invalid={Boolean(errors.key)}
              {...form.register('key', {
                setValueAs: (v: string) => v.toUpperCase(),
              })}
            />
            <FieldError errors={[errors.key]} />
          </Field>
          <Field data-invalid={Boolean(errors.departmentId)}>
            <FieldLabel htmlFor="project-department">Department</FieldLabel>
            <Controller
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={departments.isPending}
                >
                  <SelectTrigger
                    id="project-department"
                    className="w-full"
                    aria-invalid={Boolean(errors.departmentId)}
                  >
                    <SelectValue
                      placeholder={departments.isPending ? 'Loading…' : 'Select a department'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.data?.data.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.departmentId]} />
            {departments.isError && <FieldError>Could not load departments.</FieldError>}
          </Field>
        </div>
        <FieldDescription className="-mt-4">
          The key prefixes task numbers, e.g.{' '}
          <span className="font-mono">{keyPreview || 'KEY'}-1</span>.
        </FieldDescription>

        <Field>
          <FieldLabel htmlFor="project-visibility">Visibility</FieldLabel>
          <Controller
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="project-visibility" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjectVisibility).map((v) => (
                      <SelectItem key={v} value={v}>
                        {projectVisibilityLabel[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{VISIBILITY_HELP[field.value]}</FieldDescription>
              </>
            )}
          />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="project-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea id="project-description" rows={3} {...form.register('description')} />
          <FieldError errors={[errors.description]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="project-start">Start date</FieldLabel>
            <Input id="project-start" type="date" {...form.register('startDate')} />
          </Field>
          <Field data-invalid={Boolean(errors.endDate)}>
            <FieldLabel htmlFor="project-end">End date</FieldLabel>
            <Input
              id="project-end"
              type="date"
              aria-invalid={Boolean(errors.endDate)}
              {...form.register('endDate')}
            />
            <FieldError errors={[errors.endDate]} />
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
          Create project
        </Button>
      </DialogFooter>
    </form>
  );
}
