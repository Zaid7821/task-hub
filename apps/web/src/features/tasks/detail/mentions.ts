import { MENTION_PATTERN, type UserSummary } from '@aionos/shared';

export interface Mention {
  id: string;
  name: string;
}

const pattern = () => new RegExp(MENTION_PATTERN.source, 'gi');
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Stored body (`<@id>` tokens) -> editable text (`@Display Name`) plus the mentions it contains. */
export function toEditable(
  body: string,
  users: UserSummary[],
): { text: string; mentions: Mention[] } {
  const mentions: Mention[] = [];
  const text = body.replace(pattern(), (token, id: string) => {
    const user = users.find((u) => u.id.toLowerCase() === id.toLowerCase());
    if (!user) return token;
    if (!mentions.some((m) => m.id === user.id))
      mentions.push({ id: user.id, name: user.displayName });
    return `@${user.displayName}`;
  });
  return { text, mentions };
}

/** Editable text -> stored body: `@Display Name` of picked mentions become `<@id>` tokens. */
export function toStorage(text: string, mentions: Mention[]): string {
  // Longest names first so "@Ana Gupta" is not consumed by a shorter "@Ana".
  return [...mentions]
    .sort((a, b) => b.name.length - a.name.length)
    .reduce(
      (acc, m) => acc.replace(new RegExp(`@${escapeRegExp(m.name)}(?![\\w])`, 'g'), `<@${m.id}>`),
      text,
    )
    .trim();
}

/** Splits a stored body into text and mention parts for rendering. */
export function splitMentions(
  body: string,
  users: UserSummary[],
): ({ type: 'text'; value: string } | { type: 'mention'; user: UserSummary | null; id: string })[] {
  const parts: (
    { type: 'text'; value: string } | { type: 'mention'; user: UserSummary | null; id: string }
  )[] = [];
  let last = 0;
  for (const match of body.matchAll(pattern())) {
    const index = match.index;
    if (index > last) parts.push({ type: 'text', value: body.slice(last, index) });
    const id = match[1] ?? '';
    parts.push({
      type: 'mention',
      id,
      user: users.find((u) => u.id.toLowerCase() === id.toLowerCase()) ?? null,
    });
    last = index + match[0].length;
  }
  if (last < body.length) parts.push({ type: 'text', value: body.slice(last) });
  return parts;
}

/** The "@query" being typed right before the caret, if any. */
export function activeMentionQuery(
  text: string,
  caret: number,
): { query: string; start: number } | null {
  const match = /(^|\s)@([^\s@]{0,30})$/.exec(text.slice(0, caret));
  if (!match) return null;
  return { query: match[2] ?? '', start: caret - (match[2]?.length ?? 0) - 1 };
}
