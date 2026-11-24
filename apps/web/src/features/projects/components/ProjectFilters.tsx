import { ProjectStatus, ProjectVisibility } from '@aionos/shared';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { projectStatusLabel, projectVisibilityLabel } from '@/lib/labels';
import {
  PROJECT_SORT_OPTIONS,
  type ProjectListFilters,
  type useProjectListParams,
} from '../hooks/use-project-list-params';

const ALL = 'all';

interface ProjectFiltersProps {
  filters: ProjectListFilters;
  update: ReturnType<typeof useProjectListParams>['update'];
  hasActiveFilters: boolean;
}

export function ProjectFilters({ filters, update, hasActiveFilters }: ProjectFiltersProps) {
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchText.trim());
  // Last search value written to the URL; prevents a stale debounce from re-applying after "Clear".
  const pushedSearch = useRef(filters.search);

  // Effect event: `update` changes identity on every navigation, which must not re-trigger the push.
  const pushSearch = useEffectEvent((value: string) => {
    if (value === pushedSearch.current) return;
    pushedSearch.current = value;
    update({ q: value });
  });

  useEffect(() => {
    pushSearch(debouncedSearch);
  }, [debouncedSearch]);

  const clearAll = () => {
    setSearchText('');
    pushedSearch.current = '';
    update({ q: null, status: null, visibility: null, mine: null });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative lg:w-72">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by name or key"
          aria-label="Search projects"
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => update({ status: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Not archived</SelectItem>
            <SelectSeparator />
            {Object.values(ProjectStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {projectStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.visibility ?? ALL}
          onValueChange={(v) => update({ visibility: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any visibility</SelectItem>
            <SelectSeparator />
            {Object.values(ProjectVisibility).map((v) => (
              <SelectItem key={v} value={v}>
                {projectVisibilityLabel[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="mine-only"
            checked={filters.mine}
            onCheckedChange={(checked) => update({ mine: checked === true ? '1' : null })}
          />
          <Label htmlFor="mine-only" className="font-normal">
            My projects only
          </Label>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <XIcon /> Clear
          </Button>
        )}
      </div>

      <div className="lg:ml-auto">
        <Select
          value={filters.sort}
          onValueChange={(v) => update({ sort: v === 'name' ? null : v })}
        >
          <SelectTrigger className="w-44" aria-label="Sort projects">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(PROJECT_SORT_OPTIONS).map(([value, option]) => (
              <SelectItem key={value} value={value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
