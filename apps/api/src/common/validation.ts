import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

/** Query-string boolean: "true" -> true, "false" -> false, anything else left for validation. */
export const ToBoolean = () =>
  Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );

/** Trims strings; empty strings become undefined (treated as "not provided"). */
export const TrimOptional = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

/** Trims strings, keeping empty strings (so length validators can reject them). */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Optional but not nullable: skips validation only when the field is absent. */
export const IsOptionalNonNull = () =>
  ValidateIf((_object: object, value: unknown) => value !== undefined);

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Matches a "YYYY-MM-DD" string that is also a real calendar date. */
export function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}
