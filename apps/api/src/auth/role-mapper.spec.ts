import { SystemRole } from '../generated/prisma/enums.js';
import { mapEntraRoles } from './role-mapper.js';

describe('mapEntraRoles', () => {
  it('returns null when the claim is missing or has no known role', () => {
    expect(mapEntraRoles(undefined)).toBeNull();
    expect(mapEntraRoles('SUPER_ADMIN')).toBeNull();
    expect(mapEntraRoles([])).toBeNull();
    expect(mapEntraRoles(['Task.Read', 'admin'])).toBeNull();
  });

  it('maps an app role value to the SystemRole', () => {
    expect(mapEntraRoles(['MANAGER'])).toBe(SystemRole.MANAGER);
  });

  it('picks the highest role when several are assigned', () => {
    expect(mapEntraRoles(['EMPLOYEE', 'DEPARTMENT_HEAD', 'MANAGER'])).toBe(
      SystemRole.DEPARTMENT_HEAD,
    );
    expect(mapEntraRoles(['VIEWER', 'unknown', 'SUPER_ADMIN'])).toBe(SystemRole.SUPER_ADMIN);
  });
});
