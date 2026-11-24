import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { emailFromClaims, InvalidTokenError, verifyEntraAccessToken } from './entra-token.js';

const TENANT = '11111111-1111-4111-8111-111111111111';
const API_CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const OID = '33333333-3333-4333-8333-333333333333';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const expected = { issuer: ISSUER, audiences: [API_CLIENT_ID], tenantId: TENANT };

const { publicKey, privateKey } = await generateKeyPair('RS256');
const other = await generateKeyPair('RS256');
const keys = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }],
});

const baseClaims: JWTPayload = {
  oid: OID,
  tid: TENANT,
  scp: 'access_as_user',
  name: 'Priya Nair',
  preferred_username: 'Priya.Nair@AIonOS.ai',
  roles: ['MANAGER'],
};

function sign(
  claims: JWTPayload = baseClaims,
  opts: { key?: typeof privateKey; exp?: string; aud?: string; iss?: string } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? API_CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(opts.key ?? privateKey);
}

const rejects = async (token: Promise<string>) =>
  expect(verifyEntraAccessToken(await token, keys, expected)).rejects.toBeInstanceOf(
    InvalidTokenError,
  );

describe('verifyEntraAccessToken', () => {
  it('accepts a valid delegated token and returns its claims', async () => {
    const claims = await verifyEntraAccessToken(await sign(), keys, expected);
    expect(claims.oid).toBe(OID);
    expect(claims.roles).toEqual(['MANAGER']);
    expect(emailFromClaims(claims)).toBe('priya.nair@aionos.ai');
  });

  it('rejects a token signed with an unknown key', () =>
    rejects(sign(baseClaims, { key: other.privateKey })));
  it('rejects an expired token', () => rejects(sign(baseClaims, { exp: '-5m' })));
  it('rejects the wrong audience', () => rejects(sign(baseClaims, { aud: 'api://someone-else' })));
  it('rejects the wrong issuer', () =>
    rejects(sign(baseClaims, { iss: 'https://login.microsoftonline.com/other/v2.0' })));
  it('rejects a token from another tenant', () =>
    rejects(sign({ ...baseClaims, tid: 'other-tenant' })));
  it('rejects app-only tokens', () =>
    rejects(sign({ ...baseClaims, scp: undefined, idtyp: 'app' })));
  it('rejects tokens without an oid', () => rejects(sign({ ...baseClaims, oid: undefined })));
  it('rejects a tampered token', async () => {
    const token = await sign();
    const [h, , s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...baseClaims, roles: ['SUPER_ADMIN'] })).toString(
      'base64url',
    );
    await expect(
      verifyEntraAccessToken(`${h}.${forged}.${s}`, keys, expected),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
