import { BookmarkPlusIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSavedViewMutations } from '@/api/saved-views';
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
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface SaveViewButtonProps {
  /** App path of the current list, e.g. location.pathname. */
  path: string;
  /** Current URL query without "?". Nothing to save when empty. */
  query: string;
  defaultName: string;
  className?: string;
}

/** Saves the current filters/sort as a named view, shown under "Saved views" in the sidebar. */
export function SaveViewButton({ path, query, defaultName, className }: SaveViewButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const { create } = useSavedViewMutations();

  if (!query) return null;

  const save = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), path, query },
      {
        onSuccess: (view) => {
          toast.success(`Saved view "${view.name}"`, { description: 'Find it in the sidebar.' });
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName(defaultName);
          create.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <BookmarkPlusIcon /> Save view
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save this view</DialogTitle>
          <DialogDescription>
            Keeps the current filters and sort. Only you can see it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-2"
        >
          <FieldLabel htmlFor="saved-view-name">Name</FieldLabel>
          <Input
            id="saved-view-name"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {create.isError && <FieldError>{create.error.message}</FieldError>}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending && <Loader2Icon className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
