# Status

Where the project actually stands, kept up to date as milestones land and issues get fixed.
`docs/DESIGN.md` is the decision record and changes rarely; this file changes often.

_Last updated: 2026-11-13._

## Current work

- **Task:** M0 planning docs, branch `feature/CB-1-planning-docs`.
- **Files touched:** `docs/` (context files, openapi.yaml, erd.puml/png, DESIGN.md, STATUS.md), `db/schema.sql`, `db/seed.sql`, `AGENTS.md`, `README.md`.
- **Done so far:** inputs copied into `docs/`; schema v3 + seed edited and loaded on PostgreSQL 16; ERD regenerated; openapi.yaml updated; DESIGN.md written.
- **Next step:** PR https://github.com/Albert2502/campus-sports-booking-backend/pull/1 is waiting for Alexandru's review and merge; after the merge, start M1 with `feature/CB-2-repo-setup`.
- **Blockers / open questions:** none.

## Milestones

| | Scope | Status |
| --- | --- | --- |
| **M0** | Planning: docs, schema v3, contract update, Jira sync (done 2026-11-12: CB-2, 4, 14, 15, 21, 30 edited; CB-44, 45, 46 created) | Work done 2026-11-12 (openapi also on Confluence "Document swagger", attachment v2); waiting for PR merge |
| **M1** | Lab 6: CB-2 repo setup, CB-3 Express server, CB-4 database, CB-14 facilities API, CB-44 facility images API | Not started |
| **M2** | MVP backend tasks from Jira CB (planned after M1) | Not started |

## Bugs found and fixed

_None yet._

## Open issues

- `docs/openapi.yaml` has 5 lint errors and 6 warnings under `redocly lint` (`nullable-type-sibling` ×3, `struct` ×2, missing 4XX on 4 operations, no license, example server). They were already in the team's original file; the v3 edits added none. To fix in a separate change once the team agrees.
- Remote branches `claude/gracious-goodall-oqd3wc` (backend) and `claude/admiring-gates-0gfcp0` (frontend) are leftovers of an earlier session; their content is already on this branch. They have to be deleted on GitHub by hand (deletion from the dev container is refused).

## Still to do

- `TODO(CB-8)`: admin-only facility routes are open in Lab 6; CB-8 adds `requireRole('admin')`.
- CB-2: add `uploads/` and `node_modules/` to `.gitignore`.

## Not yet verified

- Seed corrections (DESIGN §5.2) checked only by loading `db/seed.sql` on PostgreSQL 16 and querying it; no application code reads them yet.
