import type { BoardDto, TaskDto } from '@aionos/shared';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import type { MoveTaskVariables } from '@/api/tasks';
import { taskStatusLabel } from '@/lib/labels';
import { BoardColumn } from './BoardColumn';
import {
  BOARD_COLUMNS,
  findColumn,
  indexInColumn,
  moveTaskInBoard,
  settleMove,
} from './board-utils';
import { TaskCardView } from './TaskCard';

interface KanbanBoardProps {
  board: BoardDto;
  canEdit: boolean;
  onMove: (move: MoveTaskVariables) => void;
}

function findTask(board: BoardDto, id: UniqueIdentifier): TaskDto | undefined {
  for (const status of BOARD_COLUMNS) {
    const task = board[status].find((t) => t.id === id);
    if (task) return task;
  }
  return undefined;
}

export function KanbanBoard({ board, canEdit, onMove }: KanbanBoardProps) {
  // While dragging, the board is rendered from this local copy (cross-column moves preview live).
  const [dragBoard, setDragBoard] = useState<BoardDto | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const columns = dragBoard ?? board;
  const activeTask = activeId ? findTask(columns, activeId) : undefined;

  const sensors = useSensors(
    // A small distance threshold keeps clicks on cards working as "open task".
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reset = () => {
    setDragBoard(null);
    setActiveId(null);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragBoard(board);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragBoard((current) => {
      if (!current) return current;
      const from = findColumn(current, String(active.id));
      const to = findColumn(current, String(over.id));
      if (!from || !to || from === to) return current;
      const overIndex = indexInColumn(current, to, String(over.id));
      return moveTaskInBoard(
        current,
        String(active.id),
        to,
        overIndex < 0 ? current[to].length : overIndex,
      );
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragBoard;
    reset();
    if (!over || !current) return;
    const taskId = String(active.id);
    const column = findColumn(current, taskId);
    if (!column) return;

    // Re-order within the final column.
    let next = current;
    const overColumn = findColumn(current, String(over.id));
    if (overColumn === column && over.id !== active.id) {
      const from = indexInColumn(current, column, taskId);
      const to = indexInColumn(current, column, String(over.id));
      if (from >= 0 && to >= 0)
        next = { ...current, [column]: arrayMove(current[column], from, to) };
    }

    const originalColumn = findColumn(board, taskId);
    const unchanged =
      originalColumn === column &&
      indexInColumn(board, column, taskId) === indexInColumn(next, column, taskId);
    if (unchanged) return;

    const settled = settleMove(next, taskId);
    if (settled) {
      onMove({
        taskId,
        status: settled.status,
        position: settled.position,
        nextBoard: settled.board,
      });
    }
  };

  const label = (id: UniqueIdentifier) => {
    const task = findTask(columns, id);
    return task ? `${task.key} ${task.title}` : 'task';
  };
  const where = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return 'nowhere';
    const status = findColumn(columns, String(id));
    return status ? taskStatusLabel[status] : 'the board';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${label(active.id)}.`,
    onDragOver: ({ active, over }) => `${label(active.id)} is over ${where(over?.id)}.`,
    onDragEnd: ({ active, over }) => `Dropped ${label(active.id)} in ${where(over?.id)}.`,
    onDragCancel: ({ active }) => `Cancelled moving ${label(active.id)}.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Press space or enter to pick up a task. Use arrow keys to move it between columns, space or enter to drop, escape to cancel.',
        },
      }}
    >
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        {BOARD_COLUMNS.map((status) => (
          <BoardColumn key={status} status={status} tasks={columns[status]} canEdit={canEdit} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCardView task={activeTask} dragging />}</DragOverlay>
    </DndContext>
  );
}
