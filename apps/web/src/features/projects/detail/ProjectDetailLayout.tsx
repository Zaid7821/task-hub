import type { ProjectDto } from '@aionos/shared';
import { ArrowLeftIcon, FileQuestionIcon, LockIcon } from 'lucide-react';
import { Link, Outlet, useLocation, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { useProjectByKey } from '@/api/projects';
import { useCurrentUser } from '@/auth/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { RouteTabs } from '@/components/common/RouteTabs';
import { ProjectStatusBadge } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { VisibilityBadge } from '@/components/common/VisibilityBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  canEditProjectTasks,
  canManageProjectLabels,
  canManageProjectMembers,
} from '@/lib/permissions';
import { CreateTaskDialog } from '@/features/tasks/components/CreateTaskDialog';
import type { TaskRouteState } from '@/features/tasks/task-paths';
import { ManageLabelsDialog } from '../labels/ManageLabelsDialog';
import type { ProjectOutletContext } from './project-context';

const BackToProjects = () => (
  <Button asChild variant="outline">
    <Link to="/projects">
      <ArrowLeftIcon /> All projects
    </Link>
  </Button>
);

export function ProjectDetailLayout() {
  const { projectKey = '', taskKey } = useParams();
  const user = useCurrentUser();
  const location = useLocation();
  const project = useProjectByKey(projectKey.toUpperCase());
  // On a task URL, highlight the tab rendered behind the drawer.
  const drawerBackground = taskKey
    ? ((location.state as TaskRouteState | null)?.background ?? 'board')
    : undefined;

  if (project.isPending) return <ProjectHeaderSkeleton />;

  if (project.isError) {
    const status = project.error instanceof ApiError ? project.error.status : 0;
    if (status === 404) {
      return (
        <EmptyState
          icon={FileQuestionIcon}
          title={`Project ${projectKey.toUpperCase()} not found`}
          description="It may have been renamed or deleted, or the link is wrong."
          action={<BackToProjects />}
          className="mt-6"
        />
      );
    }
    if (status === 403) {
      return (
        <EmptyState
          icon={LockIcon}
          title="You don't have access to this project"
          description="Ask the project owner to add you as a member."
          action={<BackToProjects />}
          className="mt-6"
        />
      );
    }
    return (
      <ErrorState
        title="Could not load project"
        error={project.error}
        onRetry={() => void project.refetch()}
      />
    );
  }

  const context: ProjectOutletContext = {
    project: project.data,
    canEditTasks: canEditProjectTasks(user, project.data),
    canManageMembers: canManageProjectMembers(user, project.data),
    canManageLabels: canManageProjectLabels(user, project.data),
  };
  const base = `/projects/${project.data.key}`;

  return (
    <div className="space-y-4">
      <ProjectHeader
        project={project.data}
        canCreateTask={context.canEditTasks}
        canManageLabels={context.canManageLabels}
      />
      <RouteTabs
        tabs={[
          { label: 'Board', to: `${base}/board` },
          { label: 'List', to: `${base}/list` },
          { label: 'Members', to: `${base}/members` },
        ]}
        activeTo={drawerBackground && `${base}/${drawerBackground}`}
      />
      <Outlet context={context} />
    </div>
  );
}

function ProjectHeader({
  project,
  canCreateTask,
  canManageLabels,
}: {
  project: ProjectDto;
  canCreateTask: boolean;
  canManageLabels: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {project.key}
          </span>
          <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar user={project.owner} size="xs" />
            {project.owner.displayName}
          </span>
          <span>{project.department.name}</span>
          <VisibilityBadge visibility={project.visibility} />
          <ProgressBar value={project.progress} label="Project progress" className="w-40" />
        </div>
      </div>
      {(canCreateTask || canManageLabels) && (
        <div className="flex shrink-0 gap-2">
          {canManageLabels && <ManageLabelsDialog project={project} />}
          {canCreateTask && <CreateTaskDialog project={project} />}
        </div>
      )}
    </div>
  );
}

function ProjectHeaderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading project">
      <Skeleton className="h-7 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
