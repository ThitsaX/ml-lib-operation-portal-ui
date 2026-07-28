# Operation Portal Frontend

Operation Portal is the React frontend for the operational portal used by payment operations, settlement teams, support users, auditors, and system administrators. It connects to secured backend APIs, signs API requests with the logged-in user's access key and secret key, enforces menu-level access in the UI, supports multi-language labels, and provides operational workflows for transfers, participants, settlements, reports, approvals, audit, and role permissions.

This README is the main developer guide for the frontend repository.

## Bookmarks

- [Prerequisites](#prerequisites)
- [Repository Layout](#repository-layout)
- [Architecture](#architecture)
- [Application Flow](#application-flow)
- [Feature Modules](#feature-modules)
- [Authentication And API Signing](#authentication-and-api-signing)
- [Routing And Access Control](#routing-and-access-control)
- [Report Download Flow](#report-download-flow)
- [System Admin Permission Flow](#system-admin-permission-flow)
- [Internationalization](#internationalization)
- [Run Locally](#run-locally)
- [Build And Preview](#build-and-preview)
- [Docker Runtime](#docker-runtime)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Developer Checklist](#developer-checklist)

## Prerequisites

| Tool | Purpose |
| --- | --- |
| Node.js 20.x | Build and run the Vite React app. The Dockerfile uses `node:20-alpine`. |
| Yarn 3.3.1 or npm | Install dependencies and run scripts. The repo declares Yarn 3.3.1, while scripts use `npm run ...`. |
| Backend Operation Portal API | Required for login and all secured workflows. Configure with `VITE_API_URL`. |
| Browser devtools | Inspect network calls, signed headers, routing, and report download behavior. |

Recommended local install:

```bash
yarn install
```

or, if your local workflow uses npm:

```bash
npm install
```

## Repository Layout

| Path | Responsibility |
| --- | --- |
| `src/pages` | Route-level pages such as Transfer, Reports, Settlement, Audit, System Admin. |
| `src/components` | Shared interface components such as sidebar, header, modals, selects, cards, pagination. |
| `src/services` | API service functions. They create signed requests and call backend endpoints. |
| `src/hooks/services` | React Query hooks around API services. |
| `src/hooks` | Shared feature hooks, including report download state and system admin role hooks. |
| `src/routes` | React Router configuration and `ProtectedRoute`. |
| `src/store` | Redux Toolkit store, user session state, persisted auth/profile data. |
| `src/helpers/api` | Axios factory, API route map, request HMAC signing helper. |
| `src/helpers/errors` | API error normalization and display message helpers. |
| `src/helpers/permissions.ts` | Action-level permission helper. |
| `src/configs` | Menu IDs, action IDs, report download timing config. |
| `src/locales` | English, French, and Portuguese locale files. |
| `scripts` | i18n sync/validation and deployment helper scripts. |
| `docs` | Project documentation. |
| `Dockerfile` | Multi-stage production image: Vite build, then Nginx runtime. |
| `nginx.conf` | SPA fallback, gzip, security headers, and health endpoint. |

## Architecture

The frontend is a single-page app. Backend calls are made directly from the browser to `VITE_API_URL`. Protected pages are guarded in the router by menu IDs from the logged-in user profile.

Core runtime layers:

- Browser renders the Operation Portal React UI.
- React Router controls route navigation and protected page access.
- Redux stores persisted user profile and auth data.
- React Query manages API request lifecycle and server state.
- Service functions call secured backend endpoints.
- The API helper signs requests with HMAC headers before sending them through Axios.
- i18next loads locale labels from `src/locales`.
- Chakra UI provides the main component system and theme primitives.
- Report download context tracks long-running report jobs and persists their state in local storage.

## Application Flow

1. User opens the portal.
2. Router redirects `/` to `/home`.
3. If the user needs authentication, they use `/auth/login`.
4. Login stores auth/profile data in Redux persisted state.
5. Sidebar and protected routes use `accessMenuList` to control visibility/access.
6. Page components call hooks/services.
7. Services sign requests with the user's access key and secret key.
8. Backend returns data, files, or async report request IDs.
9. UI renders tables, forms, cards, modals, download states, and toast messages.

## Feature Modules

### Home

Landing page after login. It is the default route for `/`.

### User Management

Used to manage participant users.

Common operations:

- List users.
- Create or edit users.
- Assign roles.
- Reset passwords.
- Change user status.

Real-world scenario: an operations admin creates an account for a new support user and assigns the correct role.

### Transfer

Used to search and inspect transfers.

Common filters include:

- Transfer ID
- Date range
- Transfer type
- Currency
- Transfer state
- Payer/payee FSP and ID fields

Real-world scenario: support investigates a customer complaint by searching the transfer ID and opening transfer details.

### Participant

Used to view participant positions and participant-related details.

Real-world scenario: operations checks a DFSP's current position or liquidity status before settlement.

### Settlement

Includes settlement models, settlement windows, and finalization.

Real-world scenario: settlement operators close settlement windows and finalize settlements after the operational cycle.

### Reports

Includes settlement and transaction reports:

- Settlement bank report
- Settlement bank report use case
- Settlement overview report
- Settlement detail report
- Settlement summary report
- Settlement statement report
- Settlement audit report
- Audit report
- Transaction detail report
- Management summary report
- Transfer settlement report

Reports may be direct base64 downloads or async report downloads depending on backend response and report type.

### Pending Approvals

Used for maker-checker workflows.

Real-world scenario: a sensitive operation is submitted by one user and approved/rejected by another.

### Audit

Used to search audit logs by action, user, participant, and date filters.

Real-world scenario: compliance checks who modified a role, user, participant, or settlement setting.

### Support Center

Used to open service request or dispute-related backend links.

### System Admin

Used to manage roles and permission action grants.

Current behavior:

- Loads roles with `getRoleList`.
- Uses route-based role selection: `/system-admin/:roleId`.
- Loads permissions with `getActionListByRole`.
- Does not reuse cached action-list data.
- Clears previous role permissions during role change and API error.
- Builds category filter chips from action categories.
- Sorts categories alphabetically while keeping `All` first.
- Saves grants with `modifyRoleGrantList`.
- Creates roles through the existing `createRole` modal/API flow.

## Authentication And API Signing

The API helper lives in:

```text
src/helpers/api/index.ts
```

Requests use two headers:

- `X-AUTH-HEADER`
- `X-ACCESS-KEY`

The auth token is generated per request:

```text
HMAC_SHA256(secret, METHOD|URI|SHA256(payload-or-<BLANK>))
```

Important details:

- Empty payload is represented by `<BLANK>`.
- Payload hash and final HMAC signature are uppercased.
- The API base URL comes from `VITE_API_URL`.
- Axios timeout is 180 seconds.

When adding a service function:

1. Add or reuse the route in `src/helpers/api/routes.ts`.
2. Read `auth` from Redux store or pass the current user state.
3. Generate the access token with the correct method and URI.
4. Use `AxiosRequest(accessToken, accessKey)`.
5. Normalize API errors with `axiosErrorHandler`.

## Routing And Access Control

Routes are defined in:

```text
src/routes/index.tsx
```

Protected pages use:

```text
src/routes/ProtectedRoute.tsx
```

Menu IDs are defined in:

```text
src/configs/menu-ids.ts
```

`ProtectedRoute` compares:

- `allowedMenuId`
- current user's `accessMenuList`

If the user does not have access, the app redirects to `/home`.

When adding a new protected page:

1. Add a menu ID to `menu-ids.ts`.
2. Add a route in `src/routes/index.tsx`.
3. Wrap the page with `ProtectedRoute`.
4. Add sidebar navigation if needed.
5. Confirm backend returns the correct menu ID in `accessMenuList`.

## Report Download Flow

There are two report patterns in the app.

### Direct File Download

Some report endpoints return a base64 file. The frontend calls `downloadFile` from `src/services/report.ts`.

### Async Report Download

Long-running report downloads use:

- `ReportDownloadContext`
- `useReportDownloadState`
- `getReportDownloadStatus`
- `getReportDownloadUrlCloud`

High-level flow:

1. The report page sends a generate report request to the backend.
2. The backend returns a request ID and status.
3. The UI starts polling through the report download context.
4. The context persists pending/running state in local storage.
5. The app checks report status at the configured interval.
6. When the report is ready, the app fetches the download URL.
7. The ready file is persisted until its configured expiry.
8. The user downloads the file from the portal.

Timing configuration comes from:

```text
src/configs/report-download.ts
```

Environment variables:

| Variable | Meaning |
| --- | --- |
| `VITE_JOB_TTL_MIN` | Max polling lifetime for a report job. |
| `VITE_READY_TTL_HOURS` | How long a ready file URL is treated as valid. |
| `VITE_POLL_INTERVAL_SEC` | Polling interval for report status. |

## System Admin Permission Flow

System Admin manages role permission grants.

High-level flow:

1. The page loads role data from `getRoleList`.
2. The admin selects a role from the role dropdown.
3. The route changes to `/system-admin/:roleId`.
4. The page loads action permissions from `getActionListByRole`.
5. The admin filters permissions by search text or category.
6. The admin toggles action permissions.
7. The permission changes modal shows the selected changes.
8. The admin saves grants through `modifyRoleGrantList`.

Production behavior to preserve:

- Clear previous permissions immediately when role changes.
- Do not show stale permissions if `getActionListByRole` fails.
- Keep action-list query uncached for fresh permission data.
- Keep role ID in the route for refresh/share/back-button support.

## Internationalization

Locale source files:

```text
src/locales/en.ui.grouped.jsonc
src/locales/fr.ui.grouped.jsonc
src/locales/pt.ui.grouped.jsonc
```

Generated/plain JSON files:

```text
src/locales/en.json
src/locales/fr.json
src/locales/pt.json
```

Important scripts:

```bash
npm run i18n:sync
npm run i18n:validate
```

Recommended workflow:

1. Edit grouped JSONC locale files first.
2. Run `npm run i18n:sync`.
3. Commit both grouped JSONC and generated JSON updates.
4. Avoid adding UI text directly in components unless it is temporary.

See also:

```text
docs/i18n-maintenance-guide.md
```

## Run Locally

Create or update environment values:

```text
.env.development
```

Required variable:

```bash
VITE_API_URL=https://your-api-host
```

Optional report download variables:

```bash
VITE_JOB_TTL_MIN=15
VITE_READY_TTL_HOURS=24
VITE_POLL_INTERVAL_SEC=30
```

Start development server:

```bash
npm run dev
```

Vite will print the local URL, commonly:

```text
http://localhost:5173
```

## Build And Preview

Build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The build command performs:

1. Locale sync
2. Locale validation
3. TypeScript compile
4. Vite production build

## Docker Runtime

The Dockerfile uses:

1. `node:20-alpine` builder
2. Vite build into `dist`
3. `nginx:alpine` runtime
4. Nginx SPA fallback to `index.html`
5. Runtime environment injection through `scripts/inject-env.sh`

Build image:

```bash
docker build -t operation-portal-ui .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e VITE_API_URL=https://your-api-host \
  -e VITE_JOB_TTL_MIN=15 \
  -e VITE_READY_TTL_HOURS=24 \
  -e VITE_POLL_INTERVAL_SEC=30 \
  operation-portal-ui
```

Health check:

```text
http://localhost:3000/health
```

## Useful Commands

| Task | Command |
| --- | --- |
| Install dependencies | `yarn install` |
| Run dev server | `npm run dev` |
| Build production bundle | `npm run build` |
| Preview production bundle | `npm run preview` |
| Validate locales | `npm run i18n:validate` |
| Sync locales | `npm run i18n:sync` |
| Lint | `npm run lint` |
| Run tests | `npx jest` |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Login fails | Confirm `VITE_API_URL`, backend availability, and browser network errors. |
| Login succeeds but page redirects to `/home` | Confirm user's `accessMenuList` contains the required menu ID. |
| API returns permission denied | Confirm backend role/menu/action grants. |
| Secured API returns auth/signature error | Confirm method, URI, payload signing, access key, and secret key. |
| System Admin shows no permissions | Check `getActionListByRole` response and role ID route. |
| System Admin shows error after role change | Check backend response for `getActionListByRole`; stale data is intentionally cleared. |
| Report remains pending/running | Check backend report worker and `VITE_POLL_INTERVAL_SEC`/TTL values. |
| Report says ready but download fails | Check download URL response and browser network response. |
| Locale key is missing | Edit JSONC source and run `npm run i18n:sync`. |
| Direct route refresh returns 404 in deployment | Confirm Nginx or hosting has SPA fallback to `index.html`. |

## Developer Checklist

Before opening a PR:

- Run `npm run i18n:sync` if locale files changed.
- Run `npm run build` for TypeScript and production build validation.
- Check protected routes use the correct menu ID.
- Keep service routes centralized in `src/helpers/api/routes.ts`.
- Normalize service errors with `axiosErrorHandler`.
- Avoid showing stale data after role/filter/entity changes.
- Keep visible UI strings in i18n files where practical.
- Verify report downloads through pending, running, ready, failed, and expired states when changing report code.
