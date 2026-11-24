import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TaskDescriptionProps {
  value: string | null;
  canEdit: boolean;
  onSave: (value: string | null) => Promise<unknown>;
}

export function TaskDescription({ value, canEdit, onSave }: TaskDescriptionProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === null) return;
    setSaving(true);
    try {
      await onSave(draft.trim() || null);
      setDraft(null);
    } catch {
      // Error is surfaced by the mutation toast; keep the draft.
    } finally {
      setSaving(false);
    }
  };

  if (draft !== null) {
    return (
      <div className="space-y-2">
        <Textarea
          autoFocus
          data-escape-cancels
          aria-label="Description"
          rows={6}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void save();
            if (e.key === 'Escape') {
              e.stopPropagation();
              setDraft(null);
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDraft(null)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2Icon className="animate-spin" />} Save
          </Button>
        </div>
      </div>
    );
  }

  const content = value ? (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
  ) : (
    <p className="text-sm text-muted-foreground">
      {canEdit ? 'Add a description…' : 'No description.'}
    </p>
  );

  if (!canEdit) return content;
  return (
    <button
      type="button"
      className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1.5 text-left hover:bg-accent"
      onClick={() => setDraft(value ?? '')}
      aria-label="Edit description"
    >
      {content}
    </button>
  );
}
