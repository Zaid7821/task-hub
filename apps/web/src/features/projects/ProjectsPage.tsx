import { FolderKanbanIcon, SearchXIcon } from 'lucide-react';
import { useState } from 'react';
import { useProjects } from '@/api/projects';
import { useCurrentUser } from '@/auth/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PaginationBar } from '@/components/common/PaginationBar';
import { Button } from '@/components/ui/button';
import { canCreateProject } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { ProjectFilters } from './components/ProjectFilters';
import { ProjectsTable, ProjectsTableSkeleton } from './components/ProjectsTable';
import { useProjectListParams } from './hooks/use-project-list-params';

export function ProjectsPage() {
  const user = useCurrentUser();
  const { filters, query, update, hasActiveFilters } = useProjectListParams();
  const projects = useProjects(query);
  const canCreate = canCreateProject(user);
  const [filterResets, setFilterResets] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Projects you can access across AIonOS."
        actions={canCreate && <CreateProjectDialog />}
      />

      <ProjectFilters
        // Bumped when filters are cleared from outside the bar, so its search box resets too.
        key={filterResets}
        filters={filters}
        update={update}
        hasActiveFilters={hasActiveFilters}
      />

      {projects.isPending ? (
        <ProjectsTableSkeleton />
      ) : projects.isError ? (
        <ErrorState
          title="Could not load projects"
          error={projects.error}
          onRetry={() => void projects.refetch()}
        />
      ) : projects.data.data.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No projects match your filters"
            description="Try a different search or clear the filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  update({ q: null, status: null, visibility: null, mine: null });
                  setFilterResets((n) => n + 1);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderKanbanIcon}
            title="No projects yet"
            description={
              canCreate
                ? 'Create the first project to start tracking work.'
                : 'Projects you are added to, or that are shared with your department, will appear here.'
            }
            action={canCreate && <CreateProjectDialog />}
          />
        )
      ) : (
        <div
          className={cn('space-y-4 transition-opacity', projects.isPlaceholderData && 'opacity-60')}
        >
          <ProjectsTable projects={projects.data.data} />
          <PaginationBar
            meta={projects.data.meta}
            isFetching={projects.isFetching}
            onPageChange={(page) => update({ page: page > 1 ? String(page) : null })}
          />
        </div>
      )}
    </div>
  );
}
