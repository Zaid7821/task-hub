# CLAUDE.md: conventions for the AIonOS Work Tracker

Read this before changing code. It applies to humans and AI assistants alike. Setup and scripts
are in README.md.

## Ground rules

- **TypeScript strict everywhere. No `any`.** If a cast is unavoidable, justify it with a comment.
- **Never hardcode** secrets, tenant/client IDs, or URLs. Add an env variable, validate it
  (API: `apps/api/src/config/env.validation.ts`; web: `apps/web/src/env.ts`), and document it
  in the matching `.env.example`.
- **Don't build beyond the request.** Mark planned work with `// TODO(phase-x): …` (or the
  concrete phase, e.g. `TODO(phase-4)`).
- Comments explain _why_, not _what_. Keep them to one line where possible.
- Before finishing any change, run `pnpm typecheck`, `pnpm lint` and `pnpm format:check` from the
  root. All three must pass.
- Do not commit `.env` files. Only `.env.example` files are tracked.

## The API contract lives in `packages/shared`

`packages/shared/src` is the **single source of truth** for everything that crosses the wire:

- `enums.ts`: the Prisma enums, mirrored as `const` objects + union types. `apps/api/src/prisma/enum-parity.ts`
  fails `tsc` if they drift from `schema.prisma`, so update both together.
- `api.ts`: `API_PREFIX` (`/api/v1`), pagination limits, `Paginated<T>`, `ErrorResponse`,
  `DEV_USER_EMAIL_HEADER`.
- `contracts/*.ts`: DTOs (`*Dto`), request bodies (`*Input`), list queries (`*ListQuery`).
  Each type's doc comment names its endpoint.

Never redefine these types in `apps/api` or `apps/web`. To change an endpoint, change the contract
first, then the mock handler, then the API.

### HTTP conventions (API and mocks)

- Base path `/api/v1`. Resources are plural and kebab-case: `/time-logs`, `/projects/:id/members`.
- Lookup by human key: `GET /projects/by-key/:key`, `GET /tasks/by-key/:key` (e.g. `HRP-12`).
- **Pagination:** query `page` (default 1) and `pageSize` (default 20, max 100). Response:
  `{ data, meta: { page, pageSize, total, totalPages } }`. An invalid page or pageSize returns 400.
- **Errors:** always `{ statusCode, message, error, timestamp, path }`. `message` may be a
  `string[]` for validation errors. 401 = not authenticated, 403 = authenticated but not allowed,
  404 = missing _or not visible to the caller_ (tasks in invisible projects are reported as 404).
  409 = conflict (duplicate key or member).
- Dates: timestamps are ISO-8601 strings (`IsoDateTime`), calendar dates are `YYYY-MM-DD` (`IsoDate`).
- Decimal columns (hours) are returned as JSON numbers.

## Permissions model

These rules are mirrored in three places, which must stay identical:
`apps/web/src/lib/permissions.ts` (UI), `apps/web/src/mocks/access.ts` (mocks) and the API
guards (Phase 3+).

- **View a project:** SUPER_ADMIN sees all. PUBLIC = any active user. DEPARTMENT = same
  department. PRIVATE = members only. Members always see their projects.
- **Edit tasks** (create, edit, move, assign, comment, log time): SUPER_ADMIN, or project
  OWNER/MEMBER. Never the system role VIEWER or the project role VIEWER.
- **Manage members:** SUPER_ADMIN, the project OWNER, or MANAGER+ in the project's department.
  The owner can't be removed.
- **Create projects:** MANAGER and above. **Admin pages:** SUPER_ADMIN only.
- UI checks are for UX only. The API enforces everything independently.

## Database (Prisma, `apps/api/prisma/schema.prisma`)

- IDs are `String @id @default(uuid(7)) @db.Uuid`. Tables and columns are snake_case via
  `@@map` / `@map`. Timestamps are `@db.Timestamptz(3)` with `createdAt` and `updatedAt`
  (append-only logs have only `createdAt`).
- **Contribution history is never cascaded away.** Tasks → project, and time logs / comments /
  activity → task, are `onDelete: Restrict`. The normal "delete" for a project is
  `status = ARCHIVED`. Hard delete is SUPER_ADMIN-only and must be explicit.
- Emails are stored lower-case. `User.entraObjectId` is the Entra `oid` and the identity key.
- Task numbers come from `Project.taskCounter`, incremented **inside the same transaction** that
  creates the task.
- Schema change workflow: edit the schema, run `pnpm db:migrate` (give the migration a
  descriptive name), then `pnpm --filter @aionos/api db:generate` (Prisma 7's `migrate dev` does
  not regenerate the client), commit the migration folder, then update `seed.ts` **and**
  `apps/web/src/mocks/data/seed-data.ts` if seed data is affected. New enums go into
  `packages/shared/src/enums.ts` and `enum-parity.ts` too. If mock row shapes change, bump the
  storage key in `apps/web/src/mocks/persistence.ts`.
- Labels, checklist items, saved views and notifications are task content / personal data, so
  they cascade. Timesheet weeks lock their time logs while SUBMITTED or APPROVED (409 on change).

### Collaboration features (rules every implementation must follow)

- **Notifications** are created only through a notify service (mock: `src/mocks/notify.ts`): never
  notify the actor about their own action, skip inactive users and anyone who can no longer see
  the project. Triggers: assigned (create/reassign) → assignee; `<@id>` mention → mentioned
  people (MENTIONED); new comment → assignee + reporter (COMMENT_ADDED, unless already
  mentioned); status change → reporter + assignee; timesheet submit → approver; approve/reject →
  owner (reject carries `data.note`).
- **Mentions** are stored as `<@userId>` in comment bodies (`MENTION_PATTERN` in shared); the API
  returns resolved `mentions` on every `CommentDto`.
- **Labels** are per project; managed by people who can manage members, applied by task editors.
  Label changes write a `TaskActivity` (`UPDATED`, field `labels`, comma-joined names).
- **Timesheet approver** = the user's manager → department head → any SUPER_ADMIN (never self),
  fixed at submission time. Weeks start on Monday; future weeks cannot be submitted.

## Backend (`apps/api`): NestJS 12, ESM

> All resource modules exist (Phase 4). New modules must follow the same conventions; the existing
> ones (e.g. `src/tasks/`, `src/labels/`) are the reference.

**What every module gets for free (global, registered in `AuthModule` / `AppModule`):**

- `AuthGuard`: every route needs a valid Entra token (or the dev header). Opt out with `@Public()`.
- `RolesGuard`: `@Roles(SystemRole.MANAGER, …)` (SUPER_ADMIN always passes).
- `ProjectAccessGuard`: `@ProjectAccess('view' | 'edit-tasks' | 'manage-members', 'projectId')`
  loads the project from the route param (UUID or key), enforces the permissions model and puts
  `{ project, memberRole }` on `request.projectAccess`. For task-scoped routes, load the task, then
  call `hasProjectAccess()` from `auth/project-access.rules.ts` in the service.
- `@ProjectCtx()` injects that `{ project, memberRole }` into the handler. Task-scoped routes use
  `TaskAccessService.requireViewable/requireEditable` (export of `TasksModule`), which return 404
  for invisible tasks.
- `AuditService.record(entry, tx)` and `NotificationsService.notify(input, tx)` are global; pass the
  transaction client so the change, its audit row and its notifications commit together.
  Task activity goes through `logActivity(tx, ...)` in `tasks/task-activity.ts`.
- `@CurrentUser() user: AuthUser` gives the caller (`id`, `email`, `systemRole`, `departmentId`, …).
- `ValidationPipe` (whitelist, forbid unknown fields, transform) and `AllExceptionsFilter` (standard
  error shape; Prisma P2002/P2003 become 409 and P2025 becomes 404).
- Pagination: extend `PaginationQueryDto`, then use `pageArgs(query)` for Prisma and
  `paginated(rows, total, query)` for the response.
- Swagger at `/api/docs`. Tag controllers with `@ApiTags()`.

- **ESM:** relative imports end in `.js` (`import { X } from './x.service.js'`).
- **Module layout**, one folder per resource:
  ```
  src/<resource>/
    <resource>.module.ts
    <resource>.controller.ts   # routing, decorators, DTO binding only
    <resource>.service.ts      # all business logic and Prisma access
    dto/create-<resource>.dto.ts, update-<resource>.dto.ts, <resource>-query.dto.ts
  ```
- **Controllers stay thin.** No Prisma calls and no business rules in controllers.
- **DTOs:** classes with class-validator decorators that `implements` the matching shared
  `*Input` / `*ListQuery` type. Trim strings and bound every length and number. Enums use
  `@IsEnum(SharedEnum)`. Optional fields use `@IsOptional()`. Query DTOs extend the shared
  pagination DTO.
- Responses are the shared `*Dto` types, mapped in the service. Never return raw Prisma models
  (they would leak columns and Decimal objects).
- Inject typed config with `ConfigService<EnvironmentVariables, true>` and read it with
  `config.get('X', { infer: true })`.
- **Task activity:** every change to a task's fields, status or assignee writes a `TaskActivity`
  row (`action`, `field`, `oldValue`, `newValue`) **in the same transaction** as the change.
  Actions are `TaskActivityAction` from shared.
- **Audit log:** sensitive actions (role changes, project archive/delete, member add/remove,
  hard deletes) write an `AuditLog` row with actor, entity, metadata and IP, through the audit
  service/interceptor, never ad hoc.
- **Directory sync** (`src/sync/`): matching rules live in the pure `planSync()` (unit-tested);
  `DirectorySyncService` applies a plan in one transaction under a Postgres advisory lock. Graph is
  the source of truth for profile fields; never change `systemRole` there, and never delete users
  (deactivate). Only users with `lastSyncedAt` set are deactivated when missing from Graph, so
  seed data must keep `lastSyncedAt: null`.
- **Dev auth bypass:** with `AUTH_DEV_BYPASS=true` (never in production) the API accepts the
  `X-Dev-User-Email` header for an existing active user instead of an Entra token.

### Adding a backend module

1. Add or confirm the contract types in `packages/shared/src/contracts`.
2. Create the folder and files above, then register the module in `app.module.ts`.
3. Implement validation DTOs, the service (with activity/audit writes where required) and the
   controller (with guards: global auth, `@Roles()`, `ProjectAccessGuard` for project-scoped
   routes).
4. Add Swagger decorators, and make sure `pnpm typecheck` / `pnpm lint` pass.
5. Delete or align the corresponding MSW handler behaviour if it diverges.

## Frontend (`apps/web`)

### Structure

- `api/`: `client.ts` (fetch wrapper, auth headers, `ApiError`), `query-client.ts`, and **one
  file per resource** exporting `xxxKeys`, `xxxApi`, and `useXxx` / mutation hooks.
- `features/<feature>/`: pages and feature components (`components/`, `hooks/`, small helpers).
- `components/ui/`: shadcn/ui, vendored. Avoid editing; prefer wrapping. Add new ones with
  `npx shadcn@latest add <name>` from `apps/web`.
- `components/common/`: app-wide components (badges, `UserAvatar`, `EmptyState`, `ErrorState`,
  `PageHeader`, `ConfirmDialog`, `PaginationBar`, `FilterSelect`, `SearchInput`, …). Reuse
  before creating new ones.
- `lib/`: `permissions.ts`, `labels.ts` (all enum → text), `dates.ts` (all date formatting),
  theme. `hooks/`: generic hooks (`useUrlParams`, `useDebouncedValue`).

### Rules

- **Data fetching only through `api/` hooks.** No `fetch` in components.
- **Query keys** come from the resource's `xxxKeys` factory. After a mutation, invalidate
  everything it affects (`useInvalidateTaskViews()` for task changes).
- Mutations show a global error toast by default. Set `meta: { silentError: true }` when the
  component displays the error itself (forms).
- **Every data view has loading (skeleton), empty and error (with retry) states.**
- **List state lives in the URL** (`useUrlParams`): filters, sort and page, so views are
  shareable. Debounce search with `SearchInput`.
- **Permissions:** call helpers from `lib/permissions.ts`. Never inline role checks in components.
- **Forms:** react-hook-form + zod schema in a `*-form.ts` file next to the feature. Map form
  values to the shared `*Input` type in a `to…Input()` function.
- **Styling:** Tailwind with **theme tokens only** (`bg-primary`, `text-muted-foreground`,
  `text-success`, `text-overdue`, …). No raw colours. All colours are defined once in
  `src/index.css`, and the brand colour is the `--brand` token (light and dark).
- Must work in light and dark mode and down to 390 px width. Use `@/` imports.
- Labels for enums come from `lib/labels.ts`. Dates from `lib/dates.ts` (date-only values are
  local calendar dates).
- **Dev-only code** (dev login, MSW) is loaded only behind `import.meta.env.DEV && …` at the
  import site, so production builds tree-shake it out.
- Task URLs are `/projects/:projectKey/tasks/:taskKey`. Link with `taskPath()` and pass
  `TaskRouteState` (`background`, `returnTo`) so the drawer knows what to show behind it and
  where to go on close.

### Mock API (`src/mocks`)

- Each endpoint in the contract has an MSW handler in `mocks/handlers/<resource>.ts`, registered
  in `handlers/index.ts`.
- Handlers must behave like the real API: use `currentUser()` (401), `requireViewableProject` /
  `requireEditableTask` (404/403), `paginate()` (400 on bad paging), `apiError()` (standard
  shape), and write activity rows for task changes.
- Mock rows mirror Prisma models (`mocks/db.ts`), and `serializers.ts` converts them to the
  shared DTOs. Mock seed data (`mocks/data/seed-data.ts`) mirrors `apps/api/prisma/seed.ts`.

### Adding a frontend feature that needs a new endpoint

1. Contract types in `packages/shared` (then `pnpm --filter @aionos/shared build`).
2. MSW handler and serializer changes in `src/mocks`.
3. API functions and hooks in `src/api/<resource>.ts`.
4. UI in `src/features/<feature>`, with a lazy route in `src/routes/router.tsx` if it's a page.
5. Any permission logic goes in `lib/permissions.ts` **and** `mocks/access.ts`.

## Environment notes

- Node ≥ 22.22 (24 LTS recommended), pnpm 12. Postgres runs on host port **5433**.
- On Windows, never write `.env` files with PowerShell 5.1 `Set-Content`/`Out-File` (BOM breaks
  the first variable).
