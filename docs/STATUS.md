# Status

Where the project actually stands, kept up to date as milestones land and issues get fixed.
`docs/DESIGN.md` is the decision record and changes rarely; this file changes often.

_Last updated: 2026-11-27._

## Current work

_None._

## Milestones

| | Scope | Status |
| --- | --- | --- |
| **M0** | Planning: docs, schema v3, contract update, Jira sync (done 2026-11-12: CB-2, 4, 14, 15, 21, 30 edited; CB-44, 45, 46 created) | Done 2026-11-13 (PR #1 merged; openapi also on Confluence "Document swagger", attachment v2) |
| **M1** | Lab 6: CB-2 repo setup, CB-3 Express server, CB-4 database, CB-14 facilities API, CB-44 facility images API | Done 2026-11-27: CB-2, CB-3 (PR #2, 2026-11-20); CB-4 (docker-compose PR #8); CB-14 (PR #6); CB-44 (reviewed in PR #7, merged into `main` by PR #11). Done out of order, ahead of M1: CB-7, CB-8, CB-9 (PR #2), CB-47, CB-49, CB-10 (PRs #3–#5, 2026-11-20) |
| **M2** | MVP backend tasks from Jira CB (planned after M1) | In progress: CB-15 slots API (PR #9, merged 2026-11-27); CB-35, CB-36 users administration (PR #10, merged 2026-11-27) |

## Bugs found and fixed

_None yet._

## Open issues

- `docs/openapi.yaml`: `location` is not marked `nullable` in `Facility` and `FacilityInput`,
  but the API accepts `null` / `''` and returns `null` for an empty location (the admin
  screen sends `null`). Fix the contract, then sync it to the frontend.
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
  DESIGN §3) is applied by `GET /slots` (CB-15); bookings (CB-21) still have to apply it.
- `POST /slots` (admin creates slots) is in the contract but not in CB-15; until it
  exists, local slots come from `npm run db:dev-slots` (DESIGN §5, 7).
- Expired sanctions do not reopen accounts by themselves: `users.status` stays `blocked`
  after `ends_at` until an admin lifts the sanction (no job yet; `lift_method = expired` is
  unused). Bookings (CB-21) should treat `blocked_until` in the past as not blocked.
- `ACCOUNT_BLOCKED` on booking comes with `POST /bookings` (CB-21); `GET /users/me/sanctions`
  (blocked profile) is in the contract but not part of CB-36.

## Not yet verified

- Docker setup (CB-52): not built in the dev container (no Docker). The owner ran the local
  stack on 2026-11-27 and logged in as admin after `db:demo`; image upload through nginx was
  not reported. The Pangolin `docker-compose.yml` was not run. To check locally:
  `docker compose -f docker-compose-alt.yml up -d --build`, then
  `docker compose -f docker-compose-alt.yml exec api npm run db:demo`, log in on
  http://localhost:8080 and upload an image.
- `docker-compose.yml` (CB-4): Docker is not available in the dev container, so the file was
  only checked as YAML; `docker compose up -d` and `npm run db:reset` against it were not run.
  To check locally: `docker compose -f docker-compose-alt.yml up -d db`, `npm run db:reset`,
  `npm test`.
- Image type is checked by the file's first bytes only (JPG / PNG signature); a file that
  starts like an image but is not a valid one is stored. Decoding images would need an image
  library (a new dependency), not planned.
- `/uploads` keeps helmet's `Cross-Origin-Resource-Policy: same-origin`: images load because
  the frontend reaches the API through the Vite proxy (same origin). A frontend on another
  origin would need that header relaxed for `/uploads`.
- `GET /slots` speed ("under 500 ms", CB-15) was measured only on the dev data: 14 days
  (689 slots) in about 12 ms, one day in about 3 ms. No test checks it.
- Two admins blocking or unblocking the same account at once: the row lock on `users` is
  reasoned through, not covered by a concurrency test.
- Real delivery of the reset email through Ethereal: the dev container cannot open SMTP
  connections. To check locally: put an Ethereal inbox in `.env` (`SMTP_*`), request a
  reset for `ana@campus.test` and open the message on https://ethereal.email.
- Seed corrections (DESIGN §5.2) are checked only by `npm run db:reset` (migrations, then
  `db/seed.sql`) and by querying the data; no application code reads them yet.
- Migration 2's `down` was run once on the dev data (hours copied back from the first open
  day); it is not covered by the automated tests.
