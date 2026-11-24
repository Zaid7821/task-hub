import { SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

// TODO(phase-x): wire to a search endpoint (tasks by key/title, projects, people).
export function GlobalSearch() {
  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        toast.info('Global search is not available yet.');
      }}
    >
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search tasks, projects, people…"
        aria-label="Global search"
        className="pl-8"
      />
    </form>
  );
}
