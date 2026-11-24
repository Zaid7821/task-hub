import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth-user.js';

/** Injects the authenticated caller: `me(@CurrentUser() user: AuthUser)`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    // Only absent on @Public() routes, where this decorator must not be used.
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);
