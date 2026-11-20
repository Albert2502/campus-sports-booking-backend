# Status

Where the project actually stands, kept up to date as milestones land and issues get fixed.
`docs/DESIGN.md` is the decision record and changes rarely; this file changes often.

_Last updated: 2026-11-20._

## Current work

- **Task:** API for the login page and the main page (DESIGN §5, 2026-11-20), branch
  `feature/CB-7-login-and-home-api`. Steps, one commit each: CB-2 repo setup, CB-3 Express
  server, CB-4 database (Sequelize, migrations, seed, dev passwords), CB-7 `POST /auth/login`,
  CB-8 auth middleware, CB-9 `GET /users/me`, CB-14 `GET /facilities` (list only).
- **Files touched:** `package.json`, `package-lock.json`, tool configs, `.gitignore`, `src/`,
  `db/`, `README.md`, `docs/DESIGN.md`, `docs/STATUS.md`.
- **Done so far:** CB-2 configs (ESLint, Prettier, `.nvmrc`, `.gitignore`); CB-3 Express
  server (helmet, cors, morgan, `/api/v1/health`, `Error` answers, docs at `/api/docs`).
- **Next step:** CB-4 database.
- **Blockers / open questions:** none; the branch is not pushed yet.

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

- `TODO(CB-8)`: admin-only facility routes are open in Lab 6; CB-8 adds `requireRole('admin')`.

## Not yet verified

- Seed corrections (DESIGN §5.2) checked only by loading `db/seed.sql` on PostgreSQL 16 and querying it; no application code reads them yet.
