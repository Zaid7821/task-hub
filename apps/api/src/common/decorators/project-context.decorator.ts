import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ProjectAccessContext } from '../guards/project-access.guard.js';

/** Injects what ProjectAccessGuard resolved. Only valid on handlers with @ProjectAccess(). */
export const ProjectCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ProjectAccessContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.projectAccess) {
      throw new InternalServerErrorException('@ProjectCtx() used without @ProjectAccess()');
    }
    return request.projectAccess;
  },
);
