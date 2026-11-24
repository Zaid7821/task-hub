import type { ProjectDto } from '@aionos/shared';
import { UsersIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ProjectStatusBadge } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { VisibilityBadge } from '@/components/common/VisibilityBadge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const projectPath = (p: ProjectDto) => `/projects/${p.key}/board`;

function KeyChip({ projectKey }: { projectKey: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
      {projectKey}
    </span>
  );
}

function OwnerCell({ project }: { project: ProjectDto }) {
  return (
    <span className="flex items-center gap-2">
      <UserAvatar user={project.owner} size="xs" />
      <span className="truncate">{project.owner.displayName}</span>
    </span>
  );
}

function ProgressCell({ project }: { project: ProjectDto }) {
  return (
    <div className="space-y-1">
      <ProgressBar value={project.progress} label={`${project.name} progress`} />
      <p className="text-xs text-muted-foreground">
        {project.completedTaskCount}/{project.taskCount} tasks done
      </p>
    </div>
  );
}

export function ProjectsTable({ projects }: { projects: ProjectDto[] }) {
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%]">Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="w-48">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => void navigate(projectPath(p))}
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <KeyChip projectKey={p.key} />
                    <Link
                      to={projectPath(p)}
                      className="truncate font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.name}
                    </Link>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {p.department.name}
                  </p>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={p.status} />
                </TableCell>
                <TableCell>
                  <VisibilityBadge visibility={p.visibility} />
                </TableCell>
                <TableCell className="max-w-44">
                  <OwnerCell project={p} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.memberCount}</TableCell>
                <TableCell>
                  <ProgressCell project={p} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="grid gap-3 md:hidden">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={projectPath(p)} className="block">
              <Card className="gap-3 p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <KeyChip projectKey={p.key} />
                    <p className="mt-1 truncate font-medium">{p.name}</p>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <OwnerCell project={p} />
                  <VisibilityBadge visibility={p.visibility} />
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <UsersIcon className="size-3.5" aria-hidden /> {p.memberCount}
                  </span>
                </div>
                <ProgressCell project={p} />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ProjectsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-xl border p-4" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="hidden h-5 w-20 md:block" />
          <Skeleton className="hidden h-5 w-24 md:block" />
          <Skeleton className="hidden h-5 w-40 md:block" />
        </div>
      ))}
    </div>
  );
}
