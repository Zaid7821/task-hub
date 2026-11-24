import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ALL = '__all__';

interface FilterSelectProps {
  label: string;
  value: string | undefined;
  allLabel: string;
  options: [value: string, label: string][];
  onChange: (value: string | null) => void;
  className?: string;
}

/** Compact filter dropdown with an "all" option that maps to null (no filter). */
export function FilterSelect({
  label,
  value,
  allLabel,
  options,
  onChange,
  className,
}: FilterSelectProps) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger className={cn('w-40', className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        <SelectSeparator />
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
