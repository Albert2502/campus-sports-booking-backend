# Status

Where the project actually stands, kept up to date as milestones land and issues get fixed.
`docs/DESIGN.md` is the decision record and changes rarely; this file changes often.

_Last updated: 2026-11-24._

## Current work

- **Task:** M1 / CB-14 facilities API, branch `feature/CB-14-facilities-api` (DESIGN §5, 6):
  migration 2 (per-day hours in `facility_hours`, `min_booking_minutes`, `amenities`,
  `maintenance_note`; drops `opens_at`/`closes_at`), seed.sql updated to match, ERD,
  contract, then `GET /sports`, `GET /facilities/{facilityId}`, admin `POST` and
  `PATCH /facilities`. Next in M1: CB-44 images (stacked on this branch), CB-4
  docker-compose.
- **Files touched:** `db/migrations/`, `db/seed.sql`, `docs/erd.*`, `docs/openapi.yaml`,
  `src/models/`, `src/routes/`, `src/controllers/`, `src/services/`, `src/repositories/`,
  `tests/`, `docs/DESIGN.md`, `docs/STATUS.md`.
- **Done so far:** migration 2 (up and down checked on the dev data), seed.sql, ERD, contract;
  `GET /sports`, `GET /facilities/{facilityId}`, admin `POST` / `PATCH /facilities` with
  zod validation and a transaction for the hours; 55 tests green; smoke-checked on the dev
  server.
- **Next step:** PR for Alexandru's review; then CB-44 images on
  `feature/CB-44-facility-images-api`.
- **Blockers / open questions:** none.

## Milestones

| | Scope | Status |
| --- | --- | --- |
| **M0** | Planning: docs, schema v3, contract update, Jira sync (done 2026-11-12: CB-2, 4, 14, 15, 21, 30 edited; CB-44, 45, 46 created) | Done 2026-11-13 (PR #1 merged; openapi also on Confluence "Document swagger", attachment v2) |
| **M1** | Lab 6: CB-2 repo setup, CB-3 Express server, CB-4 database, CB-14 facilities API, CB-44 facility images API | In progress: CB-2, CB-3 done (PR #2, 2026-11-20); CB-4 done except docker-compose; CB-14 in review (branch `feature/CB-14-facilities-api`); CB-44 not started. Done out of order, ahead of M1: CB-7, CB-8, CB-9 (PR #2), CB-47, CB-49, CB-10 (PRs #3–#5, 2026-11-20) |
| **M2** | MVP backend tasks from Jira CB (planned after M1) | Not started |

## Bugs found and fixed

_None yet._

## Open issues

- `docs/openapi.yaml` has 5 lint errors and 6 warnings under `redocly lint` (`nullable-type-sibling` ×3, `struct` ×2, missing 4XX on 4 operations, no license, example server). They were already in the team's original file; the v3 edits added none. To fix in a separate change once the team agrees.
- Merged feature branches stay on GitHub (the dev container cannot delete remote branches); delete them on GitHub when convenient.

## Still to do

- Tokens stay valid after a password change until they expire (DESIGN §5, 4); invalidating
  them needs a password version in `users` (a migration), not planned yet.
- No rate limit yet on `POST /auth/login`, `POST /users/me/password` and
  `POST /auth/password-reset` (anyone can make the app email a known address repeatedly)
  (`express-rate-limit` is in the planned stack, DESIGN §4).
- `APP_URL` falls back to `http://localhost:5173`; a deployment would have to set it, or
  reset links would point to localhost (no deployment is planned).
- The opening-hours rule (students do not see or book slots outside a facility's hours,
  DESIGN §3) now reads `facility_hours` per weekday; it is applied with the slots (CB-15) and
  bookings (CB-21), which do not exist yet.
- CB-4: `docker-compose.yml` for PostgreSQL 16 is not written yet; the setup was checked on
  a locally installed PostgreSQL 18. Jest + Supertest and the test database come with CB-40.

## Not yet verified

- Real delivery of the reset email through Ethereal: the dev container cannot open SMTP
  connections. To check locally: put an Ethereal inbox in `.env` (`SMTP_*`), request a
  reset for `ana@campus.test` and open the message on https://ethereal.email.
- Seed corrections (DESIGN §5.2) are checked only by `npm run db:reset` (migrations, then
  `db/seed.sql`) and by querying the data; no application code reads them yet.
- Migration 2's `down` was run once on the dev data (hours copied back from the first open
  day); it is not covered by the automated tests.
