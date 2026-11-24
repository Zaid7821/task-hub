import { PencilIcon } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineEditTextProps {
  value: string;
  /** Resolve to finish editing; reject to stay in edit mode (the error is shown by the caller/toast). */
  onSave: (value: string) => Promise<unknown>;
  label: string;
  validate?: (value: string) => string | null;
  disabled?: boolean;
  className?: string;
}

/** Text that turns into an input on click. Enter or blur saves, Escape cancels. */
export function InlineEditText({
  value,
  onSave,
  label,
  validate,
  disabled = false,
  className,
}: InlineEditTextProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (disabled) return <span className={className}>{value}</span>;

  const cancel = () => {
    setDraft(null);
    setError(null);
  };

  const commit = async () => {
    if (draft === null || saving) return;
    const next = draft.trim();
    if (next === value) return cancel();
    const problem = validate?.(next) ?? null;
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await onSave(next);
      cancel();
    } catch {
      // Keep the draft so the user can retry; the mutation layer reports the error.
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // don't close the surrounding drawer/dialog
      cancel();
    }
  };

  if (draft !== null) {
    return (
      <div className="w-full">
        <Input
          autoFocus
          data-escape-cancels
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={draft}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => void commit()}
          className={cn('h-auto py-1', className)}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDraft(value)}
      className={cn(
        'group -mx-1.5 inline-flex max-w-full items-start gap-2 rounded-md px-1.5 py-0.5 text-left hover:bg-accent',
        className,
      )}
      aria-label={`${label}: ${value}. Click to edit`}
    >
      <span className="min-w-0 break-words">{value}</span>
      <PencilIcon
        className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}
