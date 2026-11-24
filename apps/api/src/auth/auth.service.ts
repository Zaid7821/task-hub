import { AuditAction } from '@aionos/shared';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { SystemRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toAuthUser, type AuthUser } from './auth-user.js';
import { emailFromClaims, InvalidTokenError, type EntraAccessClaims } from './entra-token.js';
import { EntraTokenVerifier } from './entra-token.verifier.js';
import { mapEntraRoles } from './role-mapper.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: EntraTokenVerifier,
    private readonly audit: AuditService,
  ) {}

  /** Entra bearer token -> active user (provisioned on first login). */
  async authenticateToken(token: string): Promise<AuthUser> {
    let claims: EntraAccessClaims;
    try {
      claims = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        this.logger.debug(`Rejected token: ${error.reason}`);
        throw new UnauthorizedException('Invalid or expired access token');
      }
      throw error;
    }

    const tokenRole = mapEntraRoles(claims.roles);
    let user =
      (await this.prisma.user.findUnique({ where: { entraObjectId: claims.oid } })) ??
      (await this.provision(claims, tokenRole));

    this.assertActive(user);

    // Entra app roles override the stored role; persist so lists and reports agree.
    if (tokenRole && tokenRole !== user.systemRole) {
      this.logger.log(
        `Role of ${user.email} changed ${user.systemRole} -> ${tokenRole} (Entra app role)`,
      );
      const previousRole = user.systemRole;
      user = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { systemRole: tokenRole },
        });
        await this.audit.record(
          {
            actorId: null,
            action: AuditAction.USER_ROLE_CHANGED,
            entityType: 'User',
            entityId: updated.id,
            metadata: { from: previousRole, to: tokenRole, source: 'entra' },
          },
          tx,
        );
        return updated;
      });
    }
    return toAuthUser(user);
  }

  /** Local development only (AUTH_DEV_BYPASS): authenticate an existing user by email. */
  async authenticateDevEmail(email: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) throw new UnauthorizedException(`No user with email ${email}`);
    this.assertActive(user);
    return toAuthUser(user);
  }

  private assertActive(user: User): void {
    if (!user.isActive) throw new UnauthorizedException('User account is inactive');
  }

  /** Just-in-time provisioning from token claims; Graph sync fills department/team/manager later. */
  private async provision(claims: EntraAccessClaims, tokenRole: SystemRole | null): Promise<User> {
    const email = emailFromClaims(claims);
    if (!email) throw new UnauthorizedException('Access token has no email or UPN claim');
    try {
      // upsert: two first requests arriving together must not both try to create the user.
      const user = await this.prisma.user.upsert({
        where: { entraObjectId: claims.oid },
        update: {},
        create: {
          entraObjectId: claims.oid,
          email,
          displayName: claims.name?.trim() || email,
          systemRole: tokenRole ?? SystemRole.EMPLOYEE,
        },
      });
      this.logger.log(`Provisioned user ${email} on first login`);
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // TODO(phase-x): an existing user has this email under a different Entra object id
        // (e.g. account re-created). Needs an admin decision; reject for now.
        this.logger.warn(`Email ${email} is already linked to another Entra account`);
        throw new UnauthorizedException('This account is linked to a different identity');
      }
      throw error;
    }
  }
}
