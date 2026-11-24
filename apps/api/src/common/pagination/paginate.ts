import type { Paginated } from '@aionos/shared';

interface PageRequest {
  page: number;
  pageSize: number;
}

/** Prisma `skip`/`take` for a page request. */
export function pageArgs({ page, pageSize }: PageRequest): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Wraps one page of rows in the standard `{ data, meta }` envelope. */
export function paginated<T>(
  data: T[],
  total: number,
  { page, pageSize }: PageRequest,
): Paginated<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
