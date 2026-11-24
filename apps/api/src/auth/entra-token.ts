import { errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

/** Claims of an Entra ID v2 access token that this API relies on. */
export interface EntraAccessClaims {
  oid: string;
  tid: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  roles?: string[];
  scp?: string;
}

export interface EntraTokenExpectations {
  issuer: string;
  /** Accepted `aud` values (the API's client id and/or its Application ID URI). */
  audiences: string[];
  tenantId: string;
}

/** Thrown for any token that must be rejected; `reason` is safe to log, not to return verbatim. */
export class InvalidTokenError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'InvalidTokenError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verifies signature (against the tenant JWKS), issuer, audience, expiry/not-before and the
 * claims we need. Only delegated user tokens are accepted (app-only tokens are rejected).
 */
export async function verifyEntraAccessToken(
  token: string,
  keys: JWTVerifyGetKey,
  expected: EntraTokenExpectations,
): Promise<EntraAccessClaims> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      issuer: expected.issuer,
      audience: expected.audiences,
      algorithms: ['RS256'],
      clockTolerance: 60,
      requiredClaims: ['exp', 'iat'],
    }));
  } catch (error) {
    if (error instanceof errors.JWTExpired) throw new InvalidTokenError('token expired');
    if (error instanceof errors.JOSEError)
      throw new InvalidTokenError(`${error.code}: ${error.message}`);
    throw error;
  }

  const { oid, tid, scp, idtyp } = payload;
  if (typeof oid !== 'string' || !UUID.test(oid)) throw new InvalidTokenError('missing oid claim');
  if (tid !== expected.tenantId) throw new InvalidTokenError('token from another tenant');
  if (idtyp === 'app' || typeof scp !== 'string' || scp.length === 0) {
    throw new InvalidTokenError('not a delegated user token');
  }

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return {
    oid,
    tid,
    scp,
    name: str(payload.name),
    email: str(payload.email),
    preferred_username: str(payload.preferred_username),
    upn: str(payload.upn),
    roles: Array.isArray(payload.roles)
      ? payload.roles.filter((r): r is string => typeof r === 'string')
      : undefined,
  };
}

/** Best email-like identifier from the token, lower-cased. */
export function emailFromClaims(claims: EntraAccessClaims): string | null {
  const value = claims.email ?? claims.preferred_username ?? claims.upn;
  return value ? value.trim().toLowerCase() : null;
}
