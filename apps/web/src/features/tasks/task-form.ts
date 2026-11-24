import { TaskPriority, TaskType, type CreateTaskInput } from '@aionos/shared';
import { z } from 'zod';

export const UNASSIGNED = 'unassigned';
export const NO_ESTIMATE = 'none';
export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must be at most 255 characters'),
  description: z.string().trim().max(10_000, 'Description is too long'),
  type: z.enum(TaskType),
  priority: z.enum(TaskPriority),
  assigneeId: z.string(),
  estimatePoints: z.string(),
  dueDate: z.string(),
});

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export const createTaskDefaults: CreateTaskFormValues = {
  title: '',
  description: '',
  type: TaskType.TASK,
  priority: TaskPriority.MEDIUM,
  assigneeId: UNASSIGNED,
  estimatePoints: NO_ESTIMATE,
  dueDate: '',
};

export function toCreateTaskInput(values: CreateTaskFormValues): CreateTaskInput {
  return {
    title: values.title,
    description: values.description || undefined,
    type: values.type,
    priority: values.priority,
    assigneeId: values.assigneeId === UNASSIGNED ? null : values.assigneeId,
    estimatePoints: values.estimatePoints === NO_ESTIMATE ? null : Number(values.estimatePoints),
    dueDate: values.dueDate || null,
  };
}
