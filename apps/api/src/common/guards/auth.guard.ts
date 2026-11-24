import { DEV_USER_EMAIL_HEADER } from '@aionos/shared';
import {
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../../auth/auth.service.js';
import { EnvironmentVariables } from '../../config/env.validation.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Global guard: every route requires an authenticated, active user unless marked @Public().
 * Accepts an Entra bearer token, or (local dev with AUTH_DEV_BYPASS=true) the dev email header.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly devBypass: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.devBypass = config.get('AUTH_DEV_BYPASS', { infer: true });
    if (this.devBypass) {
      this.logger.warn(
        `AUTH_DEV_BYPASS is ON: requests may authenticate with ${DEV_USER_EMAIL_HEADER}`,
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const devEmail = request.header(DEV_USER_EMAIL_HEADER);

    if (this.devBypass && devEmail) {
      request.user = await this.auth.authenticateDevEmail(devEmail);
      return true;
    }

    const [scheme, token] = (request.header('authorization') ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    request.user = await this.auth.authenticateToken(token);
    return true;
  }
}
