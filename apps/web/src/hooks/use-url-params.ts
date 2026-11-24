import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export type UrlParamChanges<K extends string> = Partial<Record<K | 'page', string | null>>;

/**
 * Reads/writes list state in the URL. Any change other than `page` resets to page 1;
 * null or empty values remove the param.
 */
export function useUrlParams<K extends string>() {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (changes: UrlParamChanges<K>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === undefined || value === '') next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const page = Number(params.get('page'));
  return { params, update, page: Number.isInteger(page) && page > 1 ? page : 1 };
}

export function parseEnumParam<T extends string>(
  values: Record<string, T>,
  raw: string | null,
): T | undefined {
  return raw !== null && (Object.values(values) as string[]).includes(raw) ? (raw as T) : undefined;
}
