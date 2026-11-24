import type { UserSummary } from '@aionos/shared';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { activeMentionQuery, type Mention } from './mentions';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  mentions: Mention[];
  onMentionsChange: (mentions: Mention[]) => void;
  /** People who can be mentioned (project members). */
  people: UserSummary[];
  onSubmitShortcut?: () => void;
  onEscape?: () => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
}

/** Textarea with "@name" autocomplete. Picked people are tracked so they can be stored as `<@id>`. */
export function MentionTextarea({
  value,
  onChange,
  mentions,
  onMentionsChange,
  people,
  onSubmitShortcut,
  onEscape,
  label,
  placeholder,
  autoFocus,
  rows = 3,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [query, setQuery] = useState<{ query: string; start: number } | null>(null);
  const [highlight, setHighlight] = useState(0);

  const matches = query
    ? people
        .filter((p) => p.displayName.toLowerCase().includes(query.query.toLowerCase()))
        .slice(0, 6)
    : [];
  const open = query !== null && matches.length > 0;

  const updateQuery = (text: string, caret: number) => {
    setQuery(activeMentionQuery(text, caret));
    setHighlight(0);
  };

  const pick = (person: UserSummary) => {
    if (!query) return;
    const caret = ref.current?.selectionStart ?? value.length;
    const insert = `@${person.displayName} `;
    const next = value.slice(0, query.start) + insert + value.slice(caret);
    onChange(next);
    if (!mentions.some((m) => m.id === person.id)) {
      onMentionsChange([...mentions, { id: person.id, name: person.displayName }]);
    }
    setQuery(null);
    const pos = query.start + insert.length;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(
          (h) => (h + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const person = matches[highlight];
        if (person) pick(person);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmitShortcut?.();
    if (e.key === 'Escape' && onEscape) {
      e.stopPropagation();
      onEscape();
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        data-escape-cancels
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          updateQuery(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onClick={(e) => updateQuery(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Mention someone"
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md"
        >
          {matches.map((person, i) => (
            <li
              key={person.id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(person);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                i === highlight && 'bg-accent',
              )}
            >
              <UserAvatar user={person} size="xs" />
              <span className="truncate">{person.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
