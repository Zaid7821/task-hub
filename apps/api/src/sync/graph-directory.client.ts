import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';

/** One account as read from Microsoft Graph `/users`. */
export interface GraphUser {
  /** Entra object id; matches User.entraObjectId. */
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName: string | null;
  jobTitle: string | null;
  department: string | null;
  employeeId: string | null;
  accountEnabled: boolean;
  /** "Member" for employees, "Guest" for B2B guests. */
  userType: string | null;
  /** Entra object id of the manager, if any. */
  managerId: string | null;
}

/** Where the sync reads accounts from (Graph in production, a fake in tests). */
export interface DirectorySource {
  listUsers(): Promise<GraphUser[]>;
}

export class GraphRequestError extends Error {}

const SELECT = [
  'id',
  'mail',
  'userPrincipalName',
  'displayName',
  'jobTitle',
  'department',
  'employeeId',
  'accountEnabled',
  'userType',
].join(',');
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseGraphUser(raw: unknown): GraphUser | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const upn = str(raw.userPrincipalName);
  if (!id || !upn) return null;
  const manager = isRecord(raw.manager) ? str(raw.manager.id) : null;
  return {
    id,
    mail: str(raw.mail),
    userPrincipalName: upn,
    displayName: str(raw.displayName),
    jobTitle: str(raw.jobTitle),
    department: str(raw.department),
    employeeId: str(raw.employeeId),
    accountEnabled: raw.accountEnabled === true,
    userType: str(raw.userType),
    managerId: manager,
  };
}

/**
 * Reads the directory with an app-only token (client credentials of the API app registration,
 * application permission User.Read.All). Follows paging and honours 429/503 Retry-After.
 */
@Injectable()
export class GraphDirectoryClient implements DirectorySource {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  get configured(): boolean {
    return (
      this.config.get('GRAPH_SYNC_ENABLED', { infer: true }) &&
      this.config.get('GRAPH_CLIENT_SECRET', { infer: true }).trim() !== ''
    );
  }

  async listUsers(): Promise<GraphUser[]> {
    // New token per run, so a revoked or rotated secret is reported now, not an hour later.
    this.token = null;
    const base = this.config.get('GRAPH_API_BASE_URL', { infer: true }).replace(/\/+$/, '');
    let url: string | null = `${base}/users?$select=${SELECT}&$expand=manager($select=id)&$top=999`;
    const users: GraphUser[] = [];
    while (url) {
      const page = await this.getJson(url);
      const values = Array.isArray(page.value) ? page.value : [];
      for (const raw of values) {
        const user = parseGraphUser(raw);
        if (user) users.push(user);
      }
      const next = page['@odata.nextLink'];
      url = typeof next === 'string' ? next : null;
    }
    return users;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const host = this.config.get('ENTRA_AUTHORITY_HOST', { infer: true }).replace(/\/+$/, '');
    const tenant = this.config.get('ENTRA_TENANT_ID', { infer: true });
    const graphOrigin = new URL(this.config.get('GRAPH_API_BASE_URL', { infer: true })).origin;
    const res = await fetch(`${host}/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.get('ENTRA_API_CLIENT_ID', { infer: true }),
        client_secret: this.config.get('GRAPH_CLIENT_SECRET', { infer: true }),
        scope: `${graphOrigin}/.default`,
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok || !isRecord(body) || typeof body.access_token !== 'string') {
      const detail = isRecord(body) ? (str(body.error_description) ?? str(body.error)) : null;
      // The first line of Entra's error text (e.g. AADSTS7000215) is safe and useful to admins.
      throw new GraphRequestError(
        `Could not get a Graph token (HTTP ${res.status})${detail ? `: ${detail.split('\n')[0]}` : ''}`,
      );
    }
    const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600;
    this.token = { value: body.access_token, expiresAt: Date.now() + expiresIn * 1000 };
    return this.token.value;
  }

  private async getJson(url: string, attempt = 1): Promise<Record<string, unknown>> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
      const wait = Number(res.headers.get('Retry-After') ?? '5');
      await new Promise((r) =>
        setTimeout(r, Math.min(Number.isFinite(wait) ? wait : 5, 60) * 1000),
      );
      return this.getJson(url, attempt + 1);
    }
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok || !isRecord(body)) {
      const error = isRecord(body) && isRecord(body.error) ? str(body.error.message) : null;
      if (res.status === 401) this.token = null;
      throw new GraphRequestError(
        `Graph request failed (HTTP ${res.status})${error ? `: ${error}` : ''}`,
      );
    }
    return body;
  }
}
