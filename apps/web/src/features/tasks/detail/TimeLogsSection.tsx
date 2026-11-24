import type { TaskDto } from '@aionos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClockIcon, Loader2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useLogTime, useTaskTimeLogs } from '@/api/time-logs';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, todayIso } from '@/lib/dates';

const logTimeSchema = z.object({
  hours: z
    .number({ error: 'Enter hours' })
    .min(0.25, 'At least 0.25 h')
    .max(24, 'At most 24 h')
    .refine((h) => Number.isInteger(h * 4), 'Use steps of 0.25 h (15 min)'),
  workDate: z
    .string()
    .min(1, 'Pick a date')
    .refine((d) => d <= todayIso(), 'Cannot log time in the future'),
  note: z.string().trim().max(500, 'At most 500 characters'),
});
type LogTimeValues = z.infer<typeof logTimeSchema>;

export function TimeLogsSection({ task, canLog }: { task: TaskDto; canLog: boolean }) {
  const logs = useTaskTimeLogs(task.id);

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="font-medium tabular-nums">{task.loggedHours} h</span> logged
        {task.estimateHours ? (
          <span className="text-muted-foreground"> of {task.estimateHours} h estimated</span>
        ) : null}
      </p>

      {canLog && <LogTimeForm taskId={task.id} />}

      {logs.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading time logs">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : logs.isError ? (
        <ErrorState
          title="Could not load time logs"
          error={logs.error}
          onRetry={() => void logs.refetch()}
        />
      ) : logs.data.length === 0 ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <ClockIcon className="size-4" aria-hidden /> No time logged yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label="Time logs">
          {logs.data.map((log) => (
            <li key={log.id} className="flex items-start gap-3 px-3 py-2">
              <UserAvatar user={log.user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{log.user.displayName}</span>{' '}
                  <span className="text-muted-foreground">logged</span>{' '}
                  <span className="font-medium tabular-nums">{log.hours} h</span>{' '}
                  <span className="text-muted-foreground">on {formatDate(log.workDate)}</span>
                </p>
                {log.note && <p className="text-sm text-muted-foreground">{log.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LogTimeForm({ taskId }: { taskId: string }) {
  const logTime = useLogTime(taskId);
  const form = useForm<LogTimeValues>({
    resolver: zodResolver(logTimeSchema),
    defaultValues: { hours: 1, workDate: todayIso(), note: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await logTime.mutateAsync({
        hours: values.hours,
        workDate: values.workDate,
        note: values.note || undefined,
      });
      toast.success(`Logged ${values.hours} h`);
      form.reset({ hours: 1, workDate: values.workDate, note: '' });
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Could not log time',
      });
    }
  });

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      noValidate
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[6rem_10rem_1fr_auto] sm:items-start"
      aria-label="Log time"
    >
      <Field data-invalid={Boolean(errors.hours)}>
        <FieldLabel htmlFor="log-hours">Hours</FieldLabel>
        <Input
          id="log-hours"
          type="number"
          step={0.25}
          min={0.25}
          max={24}
          aria-invalid={Boolean(errors.hours)}
          {...form.register('hours', { valueAsNumber: true })}
        />
        <FieldError errors={[errors.hours]} />
      </Field>
      <Field data-invalid={Boolean(errors.workDate)}>
        <FieldLabel htmlFor="log-date">Date</FieldLabel>
        <Input
          id="log-date"
          type="date"
          max={todayIso()}
          aria-invalid={Boolean(errors.workDate)}
          {...form.register('workDate')}
        />
        <FieldError errors={[errors.workDate]} />
      </Field>
      <Field data-invalid={Boolean(errors.note)}>
        <FieldLabel htmlFor="log-note">Note (optional)</FieldLabel>
        <Input id="log-note" placeholder="What did you work on?" {...form.register('note')} />
        <FieldError errors={[errors.note]} />
      </Field>
      <Button type="submit" className="sm:mt-6" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" />} Log time
      </Button>
      {errors.root && <FieldError className="sm:col-span-4">{errors.root.message}</FieldError>}
    </form>
  );
}
