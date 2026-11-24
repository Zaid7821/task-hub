import { useLocation, useNavigate, useParams } from 'react-router';
import { BoardTab } from '@/features/projects/detail/BoardTab';
import { ListTab } from '@/features/projects/detail/ListTab';
import { useProjectContext } from '@/features/projects/detail/project-context';
import { TaskDrawer } from './detail/TaskDrawer';
import type { TaskRouteState } from './task-paths';

/**
 * /projects/:projectKey/tasks/:taskKey: renders the tab the user came from (board by default,
 * e.g. when opening a shared link) with the task drawer on top. Closing returns to that tab.
 */
export function TaskDrawerRoute() {
  const { taskKey = '' } = useParams();
  const { project, canEditTasks, canManageLabels } = useProjectContext();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as TaskRouteState | null;
  const background = state?.background ?? 'board';
  const returnTo =
    state?.returnTo ??
    `/projects/${project.key}/${background}${background === 'list' ? location.search : ''}`;

  return (
    <>
      {background === 'list' ? <ListTab /> : <BoardTab />}
      <TaskDrawer
        taskKey={taskKey.toUpperCase()}
        projectKey={project.key}
        canEdit={canEditTasks}
        canManageLabels={canManageLabels}
        onClose={() => void navigate(returnTo)}
      />
    </>
  );
}
