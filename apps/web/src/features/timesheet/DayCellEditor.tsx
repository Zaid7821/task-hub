import type { TimesheetRowDto } from '@aionos/shared';
import { format, parseISO } from 'date-fns';
import { Loader2Icon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTimesheetMutations } from '@/api/timesheets';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DayCellEditorProps {
  row: TimesheetRowDto;
  date: string;
  hours: number;
}

/** One grid cell: shows the day's hours; opens a popover to add or remove entries. */
export function DayCellEditor({ row, date, hours }: DayCellEditorProps) {
  const [open, setOpen] = useState(false);
  const label = `${row.task.key} on ${format(parseISO(date), 'EEEE d MMM')}: ${hours} hours. Edit`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'min-w-10 rounded-md px-2 py-1.5 tabular-nums transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            hours === 0 ? 'text-muted-foreground' : 'font-medium',
          )}
        >
          {hours === 0 ? '+' : hours}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center">
        {open && <CellEditorContent row={row} date={date} />}
      </PopoverContent>
    </Popover>
  );
}

function CellEditorContent({ row, date }: { row: TimesheetRowDto; date: string }) {
  const { logTime, deleteLog } = useTimesheetMutations();
  const [hours, setHours] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const entries = row.logs.filter((l) => l.workDate === date);

  const add = () => {
    const value = Number(hours);
    if (!Number.isFinite(value) || value < 0.25 || value > 24 || !Number.isInteger(value * 4)) {
      setError('Enter 0.25 – 24 hours in steps of 0.25');
      return;
    }
    setError(null);
    logTime.mutate(
      { taskId: row.task.id, hours: value, workDate: date, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setHours('1');
          setNote('');
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">
          <span className="font-mono text-xs text-muted-foreground">{row.task.key}</span> ·{' '}
          {format(parseISO(date), 'EEE d MMM')}
        </p>
        <p className="truncate text-xs text-muted-foreground">{row.task.title}</p>
      </div>
      {entries.length > 0 && (
        <ul className="space-y-1" aria-label="Entries for this day">
          {entries.map((log) => (
            <li key={log.id} className="flex items-center gap-2 text-sm">
              <span className="w-12 font-medium tabular-nums">{log.hours} h</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {log.note ?? '—'}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${log.hours} h entry`}
                disabled={deleteLog.isPending}
                onClick={() => deleteLog.mutate(log.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="flex gap-2">
          <Input
            type="number"
            step={0.25}
            min={0.25}
            max={24}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            aria-label="Hours"
            className="h-8 w-20"
            autoFocus
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Note (optional)"
            aria-label="Note"
            className="h-8"
          />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="sm" className="w-full" disabled={logTime.isPending}>
          {logTime.isPending && <Loader2Icon className="animate-spin" />} Add time
        </Button>
      </form>
    </div>
  );
}
