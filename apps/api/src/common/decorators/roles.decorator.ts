import { SetMetadata } from '@nestjs/common';
import type { SystemRole } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the listed system roles. SUPER_ADMIN always passes.
 * Example: `@Roles(SystemRole.MANAGER, SystemRole.DEPARTMENT_HEAD)`.
 */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
