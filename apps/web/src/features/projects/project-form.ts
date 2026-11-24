import { ProjectVisibility, type CreateProjectInput } from '@aionos/shared';
import { z } from 'zod';

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Name must be at least 3 characters')
      .max(200, 'Name must be at most 200 characters'),
    key: z
      .string()
      .trim()
      .regex(PROJECT_KEY_PATTERN, '2–10 uppercase letters or digits, starting with a letter'),
    description: z.string().trim().max(5000, 'Description is too long'),
    departmentId: z.string().min(1, 'Select a department'),
    visibility: z.enum(ProjectVisibility),
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date',
  });

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export function toCreateProjectInput(values: CreateProjectFormValues): CreateProjectInput {
  return {
    key: values.key,
    name: values.name,
    description: values.description || undefined,
    departmentId: values.departmentId,
    visibility: values.visibility,
    startDate: values.startDate || undefined,
    endDate: values.endDate || undefined,
  };
}

/** "Hiring Pipeline 2027" -> "HP", "Payroll" -> "PAY". Returns "" when no valid key can be derived. */
export function suggestProjectKey(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w));
  const first = words[0];
  if (!first) return '';
  const key =
    words.length > 1
      ? words
          .slice(0, 4)
          .map((w) => w[0])
          .join('')
      : first.slice(0, 3);
  return PROJECT_KEY_PATTERN.test(key) ? key : '';
}
