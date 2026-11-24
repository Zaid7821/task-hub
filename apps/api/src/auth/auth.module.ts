import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { ProjectAccessGuard } from '../common/guards/project-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AuthService } from './auth.service.js';
import { EntraTokenVerifier } from './entra-token.verifier.js';

/** Registers the global guard chain: AuthGuard -> RolesGuard -> ProjectAccessGuard (in this order). */
@Module({
  providers: [
    EntraTokenVerifier,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ProjectAccessGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
