import type { AuthUser } from '../auth/auth-user.js';
import type { ProjectAccessContext } from '../common/guards/project-access.guard.js';

// Express's documented extension point: properties added here appear on every `Request`.
declare global {
  namespace Express {
    interface Request {
      /** Set by the global AuthGuard on every non-public route. */
      user?: AuthUser;
      /** Set by ProjectAccessGuard on routes decorated with @ProjectAccess(). */
      projectAccess?: ProjectAccessContext;
    }
  }
}
