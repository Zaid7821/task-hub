# Work Tracker

Internal project and task tracking for an organization of ~500–600 employees across departments: projects,
Kanban boards, tasks, time logs, comments and contribution reporting. Sign-in is through
Microsoft Entra ID (SSO).

## Status

| Area                                                                                         | State              |
| -------------------------------------------------------------------------------------------- | ------------------ |
| Monorepo, tooling, Docker Postgres, env validation                                           | Done               |
| Database schema (Prisma), migrations, seed data                                              | Done               |
| Frontend: layout, auth (dev + Entra), projects, board, list, members, task drawer            | Done               |
| Frontend: My Work, Dashboard, Admin pages                                                    | Done               |
| Notifications & @mentions, checklists, labels & saved views, weekly timesheets with approval | Done (UI, API, DB) |
| Backend: Entra JWT auth, dev email bypass, guards, error filter, pagination, Swagger         | Done (Phase 3)     |
| Backend: all resource endpoints, task activity, audit log, notifications                     | Done (Phase 4)     |
| Microsoft Graph directory sync (people, departments, managers), Admin ? Directory sync       | Done               |
| Manager reports (project summary, team contribution)                                         | Planned            |

The web app talks to the real API by default (`VITE_USE_MOCKS=false`). The in-browser mock API
(MSW) is still there for frontend-only work; it follows the same contract in `packages/shared`.

## Tech stack

- **Monorepo:** pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **API:** NestJS 12 (ESM), Prisma 7 + PostgreSQL 18, class-validator
- **Web:** React 19, Vite 8, React Router 7, TanStack Query 5, Tailwind CSS 4, shadcn/ui,
  dnd-kit, react-hook-form + zod, Recharts, MSW (mocks)
- **Auth:** Microsoft Entra ID: MSAL on the web, JWT (JWKS) validation in the API
- **Quality:** TypeScript strict, ESLint 10 (type-aware), Prettier

## Repository layout

```
apps/
  api/             NestJS API
    prisma/        schema.prisma, migrations/, seed.ts
    src/           one folder per resource (projects/, tasks/, timesheets/, ...), plus
                   auth/, common/ (guards, decorators, pagination), audit/, notifications/
  web/             React app
    src/
      api/         API client + one file per resource (TanStack Query hooks)
      auth/        AuthProvider, dev login, Entra (MSAL) login, route guards
      components/  ui/ (shadcn) and common/ (app-wide components)
      features/    projects, tasks, my-work, dashboard, admin
      layouts/     AppLayout (sidebar + top bar)
      lib/         permissions, labels, dates, theme
      mocks/       MSW handlers + in-memory mock database
      routes/      router + status pages
packages/
  shared/          API contract: DTOs, inputs, query types, enums (used by api and web)
docker-compose.yml PostgreSQL for local development
CLAUDE.md          Coding conventions (read before contributing; also used by AI assistants)
```

## Prerequisites

- **Node.js 24 LTS** (minimum 22.22). Older Node 22 releases crash the Nest 12 CLI.
- **pnpm 12**: `npm i -g pnpm` (or `corepack enable pnpm` if you have admin rights)
- **Docker Desktop**, for PostgreSQL
- Git

## Local setup

```bash
# 1. Install dependencies (also generates the Prisma client)
pnpm install

# 2. Create local env files from the examples
cp .env.example .env                    # docker compose (Postgres user/port)
cp apps/api/.env.example apps/api/.env  # API
cp apps/web/.env.example apps/web/.env  # web app

# 3. Start PostgreSQL (container listens on host port 5433)
pnpm db:up

# 4. Create the schema and load demo data
pnpm db:migrate
pnpm db:seed

# 5. Run everything (shared package watcher + API on :3000 + web on :5173)
pnpm dev

# Node older than 22.22 cannot run the Nest CLI; start the API without it instead:
#   cd apps/api && pnpm exec tsc -p tsconfig.build.json && node dist/main.js
```

Open http://localhost:5173. With the default `apps/web/.env` you get the **development login**:
pick any seed user (super admin, department head, manager, employee or viewer) to try the
role-based UI. Seed users use `@aionos.local` emails, e.g. `admin@aionos.local`.

> **Windows:** create and edit `.env` files with your editor (or `copy`). Do not write them with
> Windows PowerShell 5.1's `Set-Content`/`Out-File`: these add a byte-order mark (BOM), and Vite
> then silently ignores the first variable.

### Frontend only (no database, no API)

Set `VITE_USE_MOCKS=true` in `apps/web/.env` (and restart Vite) and every `/api/v1` call is answered in the browser by MSW,
so only the web app is needed:

```bash
pnpm --filter @aionos/shared build
pnpm --filter @aionos/web dev
```

The mock database is generated from the same data as `apps/api/prisma/seed.ts`. Changes you make
(projects, members, tasks, comments, time logs) are saved in the browser's `localStorage`, so they
survive page reloads. They are per browser and are not shared with anyone else. To start over, use
**user menu → Reset demo data**.

To test error states, run one of these in the browser console:

```js
localStorage.setItem('aionos.mocks.fail', 'writes'); // every POST/PATCH/DELETE returns 500
localStorage.setItem('aionos.mocks.fail', 'all'); // every request returns 500
localStorage.removeItem('aionos.mocks.fail'); // back to normal
```

## Environment variables

Every variable is documented in the `.env.example` files and validated at startup. The API
refuses to start, and the web app shows a configuration error page, if anything is invalid.

| File            | Key variables                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env`          | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` (default 5433)                                                                                                                                    |
| `apps/api/.env` | `DATABASE_URL`, `PORT`, `CORS_ORIGINS`, `SWAGGER_ENABLED`, `ENTRA_TENANT_ID`, `ENTRA_API_CLIENT_ID`, `ENTRA_API_AUDIENCE`, `GRAPH_SYNC_ENABLED`, `GRAPH_CLIENT_SECRET`, `GRAPH_SYNC_INTERVAL_HOURS`, `AUTH_DEV_BYPASS` |
| `apps/web/.env` | `VITE_API_BASE_URL`, `VITE_USE_MOCKS`, `VITE_AUTH_MODE` (`dev` or `entra`), `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_REDIRECT_URI`, `VITE_ENTRA_API_SCOPE`                                          |

Safety rails:

- `vite build` **fails** if `VITE_AUTH_MODE=dev` or `VITE_USE_MOCKS=true`. Dev login and mocks are
  also stripped from production bundles. Use a `.env.production` with `VITE_AUTH_MODE=entra` and
  `VITE_USE_MOCKS=false` for builds.
- The API refuses to start with `AUTH_DEV_BYPASS=true` when `NODE_ENV=production`.
- Never commit `.env` files. Only `.env.example` files are tracked.

## Microsoft Entra ID setup (for IT)

Two app registrations are needed in your organization's Entra tenant.

### 1. API app registration ("Work Tracker API")

1. **Expose an API:** set the Application ID URI to `api://<api-client-id>` and add a delegated
   scope named `access_as_user` (admins and users can consent).
2. **Manifest:** set `"accessTokenAcceptedVersion": 2`, so the API receives v2 tokens.
3. **App roles** (allowed member type: Users/Groups). The values must match exactly:
   `SUPER_ADMIN`, `DEPARTMENT_HEAD`, `MANAGER`, `EMPLOYEE`, `VIEWER`.
   Assign users or groups to roles under _Enterprise applications → Users and groups_. A role
   assigned here overrides the role stored in the database. Users without a role default to
   `EMPLOYEE`.
4. **For the directory sync:** under _API permissions_ add the Microsoft Graph _application_
   permission `User.Read.All` and grant admin consent. Under _Certificates & secrets_ create a
   client secret and put it in `GRAPH_CLIENT_SECRET` (store it in a secret store in production;
   note its expiry date, because the sync fails once it expires).
5. Put the tenant ID and the API's client ID into `apps/api/.env`
   (`ENTRA_TENANT_ID`, `ENTRA_API_CLIENT_ID`, `ENTRA_API_AUDIENCE`).

### 2. SPA app registration ("Work Tracker Web")

1. **Authentication → Add a platform → Single-page application.** Redirect URIs:
   `http://localhost:5173` (local) plus each deployed URL (e.g. `https://tracker.example.com`).
   Use the same URLs as front-channel logout and post-logout redirect.
2. **API permissions:** add the delegated permission _Work Tracker API →
   access_as_user_, and grant admin consent for the tenant.
3. No client secret: SPAs are public clients and use PKCE.
4. Put the values into `apps/web/.env`: `VITE_AUTH_MODE=entra`, `VITE_ENTRA_CLIENT_ID`
   (SPA client ID), `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_REDIRECT_URI`, and
   `VITE_ENTRA_API_SCOPE=api://<api-client-id>/access_as_user`.

### Directory sync (Microsoft Graph)

With `GRAPH_SYNC_ENABLED=true` the API imports people from Entra ID every
`GRAPH_SYNC_INTERVAL_HOURS` hours (default 24; `0` = manual only). Super admins can also press
**Admin ? Directory sync ? Sync now**, which shows the result of the last run.

- **Synced from Entra:** name, email (stored lower-case), job title, employee ID, department
  (created if new, matched by name ignoring case), manager, and whether the account is enabled.
  Guest accounts are ignored.
- **Not synced:** system roles (they come from Entra app roles at sign-in), teams and department
  heads (set in the database for now).
- **Leavers** (disabled in Entra, or no longer returned) are **deactivated, never deleted**, so
  their work history stays. Only users that a previous sync imported are deactivated this way;
  seed and dev accounts are left alone.
- **Safety:** an account whose email already belongs to a different Entra identity is skipped and
  listed on the page (it is never re-linked automatically). A run that would deactivate more than
  20% of active users is refused and changes nothing. Only one sync runs at a time, even with
  several API instances.
- Every run (successful or failed) is written to the audit log.

## Scripts (run from the repo root)

| Script                              | What it does                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`                          | Build shared, then run the shared watcher, API (`:3000`) and web (`:5173`) together |
| `pnpm build`                        | Build all packages                                                                  |
| `pnpm typecheck`                    | Type-check all packages (includes the shared ↔ Prisma enum parity check)            |
| `pnpm lint` / `pnpm lint:fix`       | ESLint across the monorepo                                                          |
| `pnpm format` / `pnpm format:check` | Prettier                                                                            |
| `pnpm test`                         | Run tests in all packages                                                           |
| `pnpm db:up` / `pnpm db:down`       | Start / stop the Postgres container                                                 |
| `pnpm db:migrate`                   | Create/apply migrations (`prisma migrate dev`)                                      |
| `pnpm db:seed`                      | Wipe and reload demo data (refuses to run in production)                            |
| `pnpm db:studio`                    | Open Prisma Studio                                                                  |

Package-level extras: `pnpm --filter @aionos/api db:reset` (drop and re-migrate) and
`db:generate` (regenerate the Prisma client).

## URLs (local)

| What         | URL                                 |
| ------------ | ----------------------------------- |
| Web app      | http://localhost:5173               |
| API          | http://localhost:3000/api/v1        |
| Health check | http://localhost:3000/api/v1/health |
| Swagger      | http://localhost:3000/api/docs      |

## Troubleshooting

- **`P1010: User was denied access` from Prisma:** another PostgreSQL on your machine owns port 5432. This project uses **5433** by default, so check `POSTGRES_PORT` and `DATABASE_URL`.
- **`ERR_REQUIRE_CYCLE_MODULE` when starting the API:** your Node is older than 22.22. Upgrade to
  Node 24 LTS.
- **Web shows "Invalid web configuration":** a variable is missing, or the `.env` file has a BOM
  (see the Windows note above).
- **Blank page / "Outdated Optimize Dep" after installing packages:** restart Vite with a clean
  cache: `pnpm --filter @aionos/web exec vite --force`.
- **pnpm says "Ignored build scripts":** approved packages are listed under `allowBuilds` in
  `pnpm-workspace.yaml`. Add new ones there (after review) or run `pnpm approve-builds`.
