import { TaskStatus, type BoardDto, type TaskDto } from '@aionos/shared';

export const BOARD_COLUMNS: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

const COLUMN_PREFIX = 'column:';
const POSITION_GAP = 1000;

export const columnDropId = (status: TaskStatus): string => `${COLUMN_PREFIX}${status}`;

/** The column a draggable/droppable id belongs to: either a column id or a task id inside a column. */
export function findColumn(board: BoardDto, id: string): TaskStatus | null {
  if (id.startsWith(COLUMN_PREFIX)) {
    const status = id.slice(COLUMN_PREFIX.length);
    return BOARD_COLUMNS.find((c) => c === status) ?? null;
  }
  return BOARD_COLUMNS.find((c) => board[c].some((t) => t.id === id)) ?? null;
}

export function indexInColumn(board: BoardDto, status: TaskStatus, taskId: string): number {
  return board[status].findIndex((t) => t.id === taskId);
}

/** Moves a task to `toStatus` at `toIndex` (clamped). Returns a new board; input is not mutated. */
export function moveTaskInBoard(
  board: BoardDto,
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number,
): BoardDto {
  const fromStatus = findColumn(board, taskId);
  if (!fromStatus) return board;
  const task = board[fromStatus].find((t) => t.id === taskId);
  if (!task) return board;

  const next: BoardDto = {
    ...board,
    [fromStatus]: board[fromStatus].filter((t) => t.id !== taskId),
  };
  const target = [...next[toStatus]];
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, { ...task, status: toStatus });
  next[toStatus] = target;
  return next;
}

/** A sort position between two neighbours, leaving room for future inserts. */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_GAP;
  if (before === undefined) return (after ?? POSITION_GAP) / 2;
  if (after === undefined) return before + POSITION_GAP;
  return (before + after) / 2;
}

/** Assigns the moved task its final position from its neighbours in the (already re-ordered) board. */
export function settleMove(
  board: BoardDto,
  taskId: string,
): { board: BoardDto; status: TaskStatus; position: number } | null {
  const status = findColumn(board, taskId);
  if (!status) return null;
  const column = board[status];
  const index = indexInColumn(board, status, taskId);
  const position = positionBetween(column[index - 1]?.position, column[index + 1]?.position);
  const updated: TaskDto[] = column.map((t) => (t.id === taskId ? { ...t, status, position } : t));
  return { board: { ...board, [status]: updated }, status, position };
}
