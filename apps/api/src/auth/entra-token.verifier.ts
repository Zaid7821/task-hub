import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import { EnvironmentVariables } from '../config/env.validation.js';
import {
  verifyEntraAccessToken,
  type EntraAccessClaims,
  type EntraTokenExpectations,
} from './entra-token.js';

/** Validates Entra ID v2 access tokens against the tenant's published signing keys (JWKS). */
@Injectable()
export class EntraTokenVerifier {
  private readonly keys: JWTVerifyGetKey;
  private readonly expected: EntraTokenExpectations;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const host = config.get('ENTRA_AUTHORITY_HOST', { infer: true }).replace(/\/+$/, '');
    const tenantId = config.get('ENTRA_TENANT_ID', { infer: true });
    // jose caches keys and refetches on unknown `kid` (key rotation), with a cooldown.
    this.keys = createRemoteJWKSet(new URL(`${host}/${tenantId}/discovery/v2.0/keys`));
    this.expected = {
      issuer: `${host}/${tenantId}/v2.0`,
      audiences: [
        ...new Set([
          config.get('ENTRA_API_AUDIENCE', { infer: true }),
          config.get('ENTRA_API_CLIENT_ID', { infer: true }),
        ]),
      ],
      tenantId,
    };
  }

  verify(token: string): Promise<EntraAccessClaims> {
    return verifyEntraAccessToken(token, this.keys, this.expected);
  }
}
