import type { UserSummary } from '@aionos/shared';
import { splitMentions } from './mentions';

/** Renders a stored comment body, showing `<@id>` tokens as highlighted @mentions. */
export function CommentBody({ body, mentions }: { body: string; mentions: UserSummary[] }) {
  return (
    <p className="mt-1 text-sm whitespace-pre-wrap">
      {splitMentions(body, mentions).map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <span key={i} className="rounded bg-primary/10 px-0.5 font-medium text-primary">
            @{part.user?.displayName ?? 'unknown user'}
          </span>
        ),
      )}
    </p>
  );
}
