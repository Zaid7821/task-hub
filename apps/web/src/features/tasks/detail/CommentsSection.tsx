import { SystemRole, type CommentDto, type UserSummary } from '@aionos/shared';
import { Loader2Icon, MessageSquareIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useCommentMutations, useTaskComments } from '@/api/comments';
import { useCurrentUser } from '@/auth/auth-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { CommentBody } from './CommentBody';
import { MentionTextarea } from './MentionTextarea';
import { toEditable, toStorage, type Mention } from './mentions';

interface CommentsSectionProps {
  taskId: string;
  canComment: boolean;
  /** People who can be @mentioned (project members). */
  people: UserSummary[];
}

export function CommentsSection({ taskId, canComment, people }: CommentsSectionProps) {
  const comments = useTaskComments(taskId);
  const mutations = useCommentMutations(taskId);
  const [toDelete, setToDelete] = useState<CommentDto | null>(null);

  return (
    <div className="space-y-4">
      {comments.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading comments">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : comments.isError ? (
        <ErrorState
          title="Could not load comments"
          error={comments.error}
          onRetry={() => void comments.refetch()}
        />
      ) : comments.data.length === 0 ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <MessageSquareIcon className="size-4" aria-hidden /> No comments yet.
        </p>
      ) : (
        <ul className="space-y-4" aria-label="Comments">
          {comments.data.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              people={people}
              onSave={(body) => mutations.update.mutateAsync({ id: c.id, body })}
              onDelete={() => setToDelete(c)}
            />
          ))}
        </ul>
      )}

      {canComment && (
        <CommentComposer people={people} onSubmit={(body) => mutations.create.mutateAsync(body)} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this comment?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (toDelete) mutations.remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

interface CommentItemProps {
  comment: CommentDto;
  people: UserSummary[];
  onSave: (body: string) => Promise<unknown>;
  onDelete: () => void;
}

function CommentItem({ comment, people, onSave, onDelete }: CommentItemProps) {
  const user = useCurrentUser();
  const [draft, setDraft] = useState<{ text: string; mentions: Mention[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const isAuthor = comment.author.id === user.id;
  const canDelete = isAuthor || user.systemRole === SystemRole.SUPER_ADMIN;

  const save = async () => {
    if (!draft?.text.trim()) return;
    setSaving(true);
    try {
      await onSave(toStorage(draft.text, draft.mentions));
      setDraft(null);
    } catch {
      // Toast shows the error; keep editing.
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex gap-3">
      <UserAvatar user={comment.author} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{comment.author.displayName}</span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={comment.createdAt}
            title={formatDateTime(comment.createdAt)}
          >
            {timeAgo(comment.createdAt)}
          </time>
          {comment.editedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
          {draft === null && (isAuthor || canDelete) && (
            <span className="ml-auto flex gap-1">
              {isAuthor && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit comment"
                  onClick={() =>
                    setDraft(toEditable(comment.body, [...comment.mentions, ...people]))
                  }
                >
                  <PencilIcon />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete comment"
                  onClick={onDelete}
                >
                  <Trash2Icon />
                </Button>
              )}
            </span>
          )}
        </div>
        {draft === null ? (
          <CommentBody body={comment.body} mentions={comment.mentions} />
        ) : (
          <div className="mt-1 space-y-2">
            <MentionTextarea
              autoFocus
              label="Edit comment"
              value={draft.text}
              onChange={(text) => setDraft((d) => (d ? { ...d, text } : d))}
              mentions={draft.mentions}
              onMentionsChange={(mentions) => setDraft((d) => (d ? { ...d, mentions } : d))}
              people={people}
              onSubmitShortcut={() => void save()}
              onEscape={() => setDraft(null)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving || !draft.text.trim()}>
                {saving && <Loader2Icon className="animate-spin" />} Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function CommentComposer({
  people,
  onSubmit,
}: {
  people: UserSummary[];
  onSubmit: (body: string) => Promise<unknown>;
}) {
  const user = useCurrentUser();
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit(toStorage(text, mentions));
      setText('');
      setMentions([]);
    } catch {
      // Toast shows the error; keep the text.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-3">
      <UserAvatar user={user} size="sm" />
      <div className="flex-1 space-y-2">
        <MentionTextarea
          label="Write a comment"
          placeholder="Write a comment… Type @ to mention someone (Ctrl+Enter to send)"
          value={text}
          onChange={setText}
          mentions={mentions}
          onMentionsChange={setMentions}
          people={people.filter((p) => p.id !== user.id)}
          onSubmitShortcut={() => void submit()}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void submit()} disabled={!text.trim() || sending}>
            {sending && <Loader2Icon className="animate-spin" />} Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
