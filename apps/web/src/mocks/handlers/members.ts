import { ProjectMemberRole, type AddProjectMemberInput } from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { canManageMembers, canViewProject, membership } from '../access';
import { db, nowIso, type MemberRow } from '../db';
import {
  apiError,
  apiPath,
  currentUser,
  paginate,
  readJson,
  requireViewableProject,
} from '../http';
import { toMemberDto, userById } from '../serializers';

const ROLE_ORDER: ProjectMemberRole[] = [
  ProjectMemberRole.OWNER,
  ProjectMemberRole.MEMBER,
  ProjectMemberRole.VIEWER,
];

function sortMembers(a: MemberRow, b: MemberRow): number {
  const byRole = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
  if (byRole !== 0) return byRole;
  return (userById(a.userId)?.displayName ?? '').localeCompare(
    userById(b.userId)?.displayName ?? '',
  );
}

export const memberHandlers = [
  http.get(apiPath('/projects/:projectId/members'), ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    const rows = db.members.filter((m) => m.projectId === project.id).sort(sortMembers);
    return HttpResponse.json(paginate(request, rows.map(toMemberDto)));
  }),

  http.post(apiPath('/projects/:projectId/members'), async ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    if (!canManageMembers(user, project)) {
      return apiError(request, 403, 'You cannot manage members of this project');
    }
    const body = await readJson<AddProjectMemberInput>(request);
    const allowedRoles: string[] = [ProjectMemberRole.MEMBER, ProjectMemberRole.VIEWER];
    if (typeof body.userId !== 'string' || !body.role || !allowedRoles.includes(body.role)) {
      return apiError(request, 400, ['userId is required', 'role must be MEMBER or VIEWER']);
    }
    const target = userById(body.userId);
    if (!target?.isActive) return apiError(request, 400, ['userId must be an active user']);
    if (membership(project.id, target.id)) {
      return apiError(request, 409, `${target.displayName} is already a member`);
    }
    const row: MemberRow = {
      projectId: project.id,
      userId: target.id,
      role: body.role,
      createdAt: nowIso(),
    };
    db.members.push(row);
    // The real API also writes an AuditLog entry.
    return HttpResponse.json(toMemberDto(row), { status: 201 });
  }),

  http.delete(apiPath('/projects/:projectId/members/:userId'), ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    if (!canManageMembers(user, project)) {
      return apiError(request, 403, 'You cannot manage members of this project');
    }
    const row = membership(project.id, String(params.userId));
    if (!row) return apiError(request, 404, 'Member not found');
    if (row.role === ProjectMemberRole.OWNER) {
      return apiError(request, 400, 'The project owner cannot be removed');
    }
    db.members.splice(db.members.indexOf(row), 1);
    // TODO(phase-x): decide what happens to tasks still assigned to the removed member.
    return new HttpResponse(null, { status: 204 });
  }),
];
