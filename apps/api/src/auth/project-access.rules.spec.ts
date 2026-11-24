import { ProjectMemberRole, ProjectVisibility, SystemRole } from '../generated/prisma/enums.js';
import { hasProjectAccess } from './project-access.rules.js';

const ENG = 'dept-eng';
const HR = 'dept-hr';
const user = (systemRole: SystemRole, departmentId: string | null = ENG) => ({
  systemRole,
  departmentId,
});
const project = (visibility: ProjectVisibility, departmentId = ENG) => ({
  visibility,
  departmentId,
});

describe('hasProjectAccess: view', () => {
  it('PUBLIC is visible to any user', () => {
    expect(
      hasProjectAccess(
        'view',
        user(SystemRole.VIEWER, HR),
        project(ProjectVisibility.PUBLIC),
        null,
      ),
    ).toBe(true);
  });

  it('DEPARTMENT is visible to the same department only (or members)', () => {
    const p = project(ProjectVisibility.DEPARTMENT);
    expect(hasProjectAccess('view', user(SystemRole.EMPLOYEE, ENG), p, null)).toBe(true);
    expect(hasProjectAccess('view', user(SystemRole.EMPLOYEE, HR), p, null)).toBe(false);
    expect(hasProjectAccess('view', user(SystemRole.EMPLOYEE, null), p, null)).toBe(false);
    expect(
      hasProjectAccess('view', user(SystemRole.EMPLOYEE, HR), p, ProjectMemberRole.MEMBER),
    ).toBe(true);
  });

  it('PRIVATE is visible to members and SUPER_ADMIN only', () => {
    const p = project(ProjectVisibility.PRIVATE);
    expect(hasProjectAccess('view', user(SystemRole.DEPARTMENT_HEAD, ENG), p, null)).toBe(false);
    expect(hasProjectAccess('view', user(SystemRole.VIEWER), p, ProjectMemberRole.VIEWER)).toBe(
      true,
    );
    expect(hasProjectAccess('view', user(SystemRole.SUPER_ADMIN, null), p, null)).toBe(true);
  });
});

describe('hasProjectAccess: edit-tasks', () => {
  const p = project(ProjectVisibility.PUBLIC);

  it('allows project owners and members', () => {
    expect(
      hasProjectAccess('edit-tasks', user(SystemRole.EMPLOYEE), p, ProjectMemberRole.MEMBER),
    ).toBe(true);
    expect(
      hasProjectAccess('edit-tasks', user(SystemRole.MANAGER), p, ProjectMemberRole.OWNER),
    ).toBe(true);
  });

  it('denies project viewers, non-members and the VIEWER system role', () => {
    expect(
      hasProjectAccess('edit-tasks', user(SystemRole.EMPLOYEE), p, ProjectMemberRole.VIEWER),
    ).toBe(false);
    expect(hasProjectAccess('edit-tasks', user(SystemRole.DEPARTMENT_HEAD), p, null)).toBe(false);
    expect(
      hasProjectAccess('edit-tasks', user(SystemRole.VIEWER), p, ProjectMemberRole.MEMBER),
    ).toBe(false);
  });

  it('allows SUPER_ADMIN without membership', () => {
    expect(hasProjectAccess('edit-tasks', user(SystemRole.SUPER_ADMIN), p, null)).toBe(true);
  });
});

describe('hasProjectAccess: manage-members', () => {
  it('allows the owner, and MANAGER+ of the project department', () => {
    const p = project(ProjectVisibility.PUBLIC, ENG);
    expect(
      hasProjectAccess('manage-members', user(SystemRole.EMPLOYEE), p, ProjectMemberRole.OWNER),
    ).toBe(true);
    expect(hasProjectAccess('manage-members', user(SystemRole.MANAGER, ENG), p, null)).toBe(true);
    expect(hasProjectAccess('manage-members', user(SystemRole.DEPARTMENT_HEAD, ENG), p, null)).toBe(
      true,
    );
  });

  it('denies managers of other departments and plain members', () => {
    const p = project(ProjectVisibility.PUBLIC, ENG);
    expect(hasProjectAccess('manage-members', user(SystemRole.MANAGER, HR), p, null)).toBe(false);
    expect(
      hasProjectAccess('manage-members', user(SystemRole.EMPLOYEE), p, ProjectMemberRole.MEMBER),
    ).toBe(false);
  });

  it('never grants management of a project the caller cannot see', () => {
    const p = project(ProjectVisibility.PRIVATE, ENG);
    expect(hasProjectAccess('manage-members', user(SystemRole.MANAGER, ENG), p, null)).toBe(false);
  });
});
