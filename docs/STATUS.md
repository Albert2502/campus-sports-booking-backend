# Status

Where the project actually stands, kept up to date as milestones land and issues get fixed.
`docs/DESIGN.md` is the decision record and changes rarely; this file changes often.

_Last updated: 2026-11-26._

## Current work

- **Task:** M2 / CB-35 users list and details, CB-36 blocking and unblocking (Alexandru),
  branch `feature/CB-35-users-admin-api` from `main` (DESIGN §5, 8): `GET /users`,
  `GET /users/{userId}`, `GET` / `POST /users/{userId}/sanctions`,
  `PATCH /sanctions/{sanctionId}`.
- **Files touched:** `src/validation/user.js`, `src/validation/sanction.js`,
  `src/models/sanction.js`, `src/models/index.js`, `src/repositories/users.repository.js`,
  `src/repositories/sanctions.repository.js`, `src/services/users.service.js`,
  `src/services/sanctions.service.js`, `src/controllers/users.controller.js`,
  `src/controllers/sanctions.controller.js`, `src/routes/users.routes.js`,
  `src/routes/sanctions.routes.js`, `src/routes/index.js`, `tests/users.admin.test.js`,
  `tests/sanctions.test.js`, `docs/openapi.yaml`, `docs/DESIGN.md`, `docs/STATUS.md`.
- **Done so far:** all five routes, the two new error codes in the contract; 52 tests
  green (20 new); blocking and unblocking smoke-checked on the dev data.
- **Next step:** PR for Albert's review.
- **Blockers / open questions:** none.

## Milestones

| | Scope | Status |
| --- | --- | --- |
| **M0** | Planning: docs, schema v3, contract update, Jira sync (done 2026-11-12: CB-2, 4, 14, 15, 21, 30 edited; CB-44, 45, 46 created) | Done 2026-11-13 (PR #1 merged; openapi also on Confluence "Document swagger", attachment v2) |
| **M1** | Lab 6: CB-2 repo setup, CB-3 Express server, CB-4 database, CB-14 facilities API, CB-44 facility images API | Not started |
| **M2** | MVP backend tasks from Jira CB (planned after M1) | In progress: CB-35, CB-36 users administration in review |

## Bugs found and fixed

_None yet._

## Open issues

- `docs/openapi.yaml` has 5 lint errors and 6 warnings under `redocly lint` (`nullable-type-sibling` ×3, `struct` ×2, missing 4XX on 4 operations, no license, example server). They were already in the team's original file; the v3 edits added none. To fix in a separate change once the team agrees.
- Remote branches `claude/gracious-goodall-oqd3wc` (backend) and `claude/admiring-gates-0gfcp0` (frontend) are leftovers of an earlier session; their content is already on this branch. They have to be deleted on GitHub by hand (deletion from the dev container is refused).

## Still to do

- Tokens stay valid after a password change until they expire (DESIGN §5, 4); invalidating
  them needs a password version in `users` (a migration), not planned yet.
- No rate limit yet on `POST /auth/login`, `POST /users/me/password` and
  `POST /auth/password-reset` (anyone can make the app email a known address repeatedly)
  (`express-rate-limit` is in the planned stack, DESIGN §4).
- `APP_URL` falls back to `http://localhost:5173`; a deployment would have to set it, or
  reset links would point to localhost (no deployment is planned).
- `TODO(CB-14)` in `src/routes/facilities.routes.js`: `GET /sports`,
  `GET /facilities/{facilityId}`, `POST` and `PATCH /facilities` (admin-only with
  `requireAuth` + `requireRole('admin')`). Only the list exists, for the main page.
- Expired sanctions do not reopen accounts by themselves: `users.status` stays `blocked`
  after `ends_at` until an admin lifts the sanction (no job yet; `lift_method = expired` is
  unused). Bookings (CB-21) should treat `blocked_until` in the past as not blocked.
- `ACCOUNT_BLOCKED` on booking comes with `POST /bookings` (CB-21); `GET /users/me/sanctions`
  (blocked profile) is in the contract but not part of CB-36.
- CB-4: `docker-compose.yml` for PostgreSQL 16 is not written yet; the setup was checked on
  a locally installed PostgreSQL 18. Jest + Supertest and the test database come with CB-40.

## Not yet verified

- Two admins blocking or unblocking the same account at once: the row lock on `users` is
  reasoned through, not covered by a concurrency test.
- Real delivery of the reset email through Ethereal: the dev container cannot open SMTP
  connections. To check locally: put an Ethereal inbox in `.env` (`SMTP_*`), request a
  reset for `ana@campus.test` and open the message on https://ethereal.email.
- Seed corrections (DESIGN §5.2) checked only by loading `db/seed.sql` on PostgreSQL 16 and querying it; no application code reads them yet.
