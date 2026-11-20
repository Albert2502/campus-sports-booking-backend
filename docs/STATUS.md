# Status

Where the project actually stands, kept up to date as milestones land and issues get fixed.
`docs/DESIGN.md` is the decision record and changes rarely; this file changes often.

_Last updated: 2026-11-20._

## Current work

- **Task:** CB-47 profile API, branch `feature/CB-47-profile-api`: `noShowCount` in
  `GET /users/me` (from `incidents`) and the Jest + Supertest setup on a separate test
  database. Next in the stack: CB-49 `POST /users/me/password`, then CB-10 password reset by
  email (each its own branch and PR, stacked on the previous one).
- **Files touched:** `package.json`, `package-lock.json`, `.env.example`, `eslint.config.js`,
  `tests/`, `src/app.js` (no request log in tests), `src/repositories/users.repository.js`,
  `src/services/users.service.js`, `README.md`, `docs/openapi.yaml`, `docs/STATUS.md`.
- **Done so far:** test setup (7 tests green, test DB isolated from dev and guarded by the `_test`
  suffix); `noShowCount` in `/users/me` and in the login profile; openapi updated.
- **Next step:** PR for Alexandru's review; then CB-49 on `feature/CB-49-change-password-api`.
- **Blockers / open questions:** none.

## Milestones

| | Scope | Status |
| --- | --- | --- |
| **M0** | Planning: docs, schema v3, contract update, Jira sync (done 2026-11-12: CB-2, 4, 14, 15, 21, 30 edited; CB-44, 45, 46 created) | Done 2026-11-13 (PR #1 merged; openapi also on Confluence "Document swagger", attachment v2) |
| **M1** | Lab 6: CB-2 repo setup, CB-3 Express server, CB-4 database, CB-14 facilities API, CB-44 facility images API | Not started |
| **M2** | MVP backend tasks from Jira CB (planned after M1) | Not started |

## Bugs found and fixed

_None yet._

## Open issues

- `docs/openapi.yaml` has 5 lint errors and 6 warnings under `redocly lint` (`nullable-type-sibling` ×3, `struct` ×2, missing 4XX on 4 operations, no license, example server). They were already in the team's original file; the v3 edits added none. To fix in a separate change once the team agrees.
- Remote branches `claude/gracious-goodall-oqd3wc` (backend) and `claude/admiring-gates-0gfcp0` (frontend) are leftovers of an earlier session; their content is already on this branch. They have to be deleted on GitHub by hand (deletion from the dev container is refused).

## Still to do

- `TODO(CB-14)` in `src/routes/facilities.routes.js`: `GET /sports`,
  `GET /facilities/{facilityId}`, `POST` and `PATCH /facilities` (admin-only with
  `requireAuth` + `requireRole('admin')`). Only the list exists, for the main page.
- CB-4: `docker-compose.yml` for PostgreSQL 16 is not written yet; the setup was checked on
  a locally installed PostgreSQL 18. Jest + Supertest and the test database come with CB-40.

## Not yet verified

- Seed corrections (DESIGN §5.2) checked only by loading `db/seed.sql` on PostgreSQL 16 and querying it; no application code reads them yet.
