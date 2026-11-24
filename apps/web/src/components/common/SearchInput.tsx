import { SearchIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Committed value (e.g. from the URL). Remount with a new `key` to reset the text externally. */
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}

/** Search box that commits its trimmed text after the user stops typing. */
export function SearchInput({ value, onCommit, placeholder, label, className }: SearchInputProps) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text.trim());
  // Last committed value; ignores stale debounces (e.g. right after an external clear).
  const committed = useRef(value);

  const commit = useEffectEvent((next: string) => {
    if (next === committed.current) return;
    committed.current = next;
    onCommit(next);
  });

  useEffect(() => {
    commit(debounced);
  }, [debounced]);

  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-8"
      />
    </div>
  );
}
