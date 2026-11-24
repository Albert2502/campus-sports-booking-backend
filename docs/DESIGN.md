# Campus Sports Booking (backend) — design record

Everything agreed with the owner before implementation started. This is the reference for
what the project *is* and *why*. When a decision here changes, change it here first, with a
dated note on what changed and why.

> **Status:** agreed 2026-11-12. Milestones in §7; progress in `docs/STATUS.md`.

---

## 1. What it is

A web platform where the students and teachers of one university (USV) book campus sports
facilities (halls, courts) without overlaps and under fairness rules. University course project
("Ingineria programelor"), team of two: Galan Albert and Butnariu Alexandru. There are two
repositories: `campus-sports-booking-backend` (Node.js/Express REST API, PostgreSQL) and
`campus-sports-booking-frontend` (React SPA, mobile first). Run locally only (no deployment in
scope). The full background lives in `docs/backend-context.md` and `docs/frontend-context.md`;
the API contract is `docs/openapi.yaml`; the data model is `docs/erd.puml` / `docs/erd.png`.

Sources: Confluence space "Proiect_lab_IP" (techthieves.atlassian.net), Jira project **CB**
"Campus booking" (same site; CB-n = the old TEC-n), Figma prototype
`T0Jv1Xx6X947N9zoyUwLuC` ("Prototip – Rezervare facilități sportive"; pages Utilizator,
Componente, Administrator).

**Precedence:** where the context files and this record differ (they still say "TO CONFIRM"
or "OPEN" for several points decided here), this record wins.

## 2. Names and glossary

| Term | Meaning / notes |
| --- | --- |
| Captain (căpitan) | The user who made a booking. A role of a booking, not an account type. |
| Facility (facilitate) | A hall or court. Status `active`, `maintenance` or `inactive`. |
| Slot (interval) | A time slot of a facility (`time_slots`); availability `free`, `occupied`, `closed`. |
| Opening hours (program) | `facilities.opens_at`–`closes_at`; NULL = no restriction. |
| Soft delete | "Dezactivează" = `status = inactive`; there is no hard delete of facilities. |
| Booking rules | The single `booking_rules` row; business limits are read from it, never hard-coded. |
| Planificator | The scheduler (node-cron jobs), not an endpoint. |

UI copy is Romanian; code identifiers, comments and commit messages are English.

---

## 3. Agreed requirements

The business rules and open questions from the context files stand (`docs/backend-context.md`
§5, `docs/frontend-context.md` §5). Open questions (teacher vs student, auctions, exact sanction
rule, refunds, displaced users) stay configurable and are **not** invented. Below: what was
decided on top of them during planning (2026-11-12).

### Facilities (schema v3)

- **Facilities carry description, opening hours, status and images.** *Why:* the Figma admin
  screens show them and the team (Albert + Alexandru) chose to bring the database up to the
  prototype. *Rejected:* implementing only the v2 fields (would leave Figma fields unbacked).
- **`status` enum (`active`, `maintenance`, `inactive`) replaces the `active` boolean.** *Why:*
  one field, no impossible combinations. *Rejected:* a second boolean `under_maintenance`.
- **`maintenance`: the facility stays listed with its badge, its slots show `closed` and nobody
  can book them (`FACILITY_CLOSED`).** `inactive`: hidden from everyone but the admin.
  `facility_closures` stays for dated closures.
- **Price is per hour (`price_per_hour`); `requires_payment` is dropped; price 0 = free.**
  Slot price = slot duration in hours × `price_per_hour`; an open-match place = slot price /
  `total_places`, rounded to 2 decimals. A booking is created `pending` when its price > 0,
  otherwise `confirmed`. *Why:* matches Figma ("Preț / oră") and keeps one source of truth.
  *Rejected:* keeping `price_per_slot`; keeping `requires_payment` next to the price.
- **Opening hours limit students only.** Students and anonymous visitors do not see slots outside
  the opening hours (GET /slots leaves them out); if a student books one by id the answer is
  404 `NOT_FOUND`, as if the slot did not exist. Teachers and admins see and book them. The admin
  may create slots outside the hours. *Rejected:* display-only hours; a dedicated
  `OUTSIDE_OPENING_HOURS` error code.
- **Several images per facility (`facility_images`), uploaded to the backend's disk.** JPG/PNG,
  ≤ 5 MB, ≤ 5 per facility; the first image (lowest `position`) is the thumbnail; files are
  served from `/uploads`. *Rejected:* image URLs only (Figma shows drag-and-drop upload); a single
  image column.
- **No hard delete of facilities.** "Dezactivează" sets `status = inactive`, "Reactivează" sets
  it back. *Why:* bookings and reports reference facilities; a delete would cascade into history.
  *Rejected:* DELETE restricted to unused facilities.
- **GET /facilities filters with `status` = `active` (default) | `maintenance` | `inactive` |
  `all`;** values other than `active` are admin-only. *Rejected:* a separate admin route.
- **Facility search ("Caută facilitate") is client-side** (name and location, diacritics
  ignored). *Why:* a handful of facilities; no contract change. *Rejected:* a `q` parameter.

### Process

- **Lab 6 first (skeleton + facilities CRUD with images, FE↔BE demo), then the MVP from Jira
  CB.** Albert sets up both repos and the first steps; then Alexandru joins.
  *Changed 2026-11-20:* the minimal setup arrives with Alexandru's login and main page branch
  (§5, "Decided during implementation", 1).
- **One branch per task, `feature/CB-<n>-<slug>`, PR into `main`, reviewed by the teammate.**
  PRs are opened only after asking. The planning docs use `feature/CB-1-planning-docs`.
  *Changed 2026-11-20:* a branch may group several tasks when they ship together, with one
  commit per step (§5, "Decided during implementation", 2).
- **Jira is updated directly** (the import CSV is no longer maintained). `docs/openapi.yaml` in
  the repos is the canonical contract; the Confluence attachment mirrors it.
- **Coding style: Google JavaScript style, enforced with current tools.** ESLint 10 flat config
  (`@eslint/js` recommended + prefer-const, no-var, eqeqeq, camelcase) and Prettier configured to
  Google formatting (2 spaces, single quotes, 80 columns, semicolons, trailing commas), plus
  `eslint-config-prettier`. *Rejected:* `eslint-config-google` (last release 2019, eslintrc only,
  uses rules ESLint 9 removed); pinning ESLint 8 (end of life).
- **Node.js 24 LTS** (`engines >=24`, `.nvmrc`), falling back to `>=22` only if 24 cannot be
  installed in the dev container.

### Non-negotiables

- Business limits come from `booking_rules`; money amounts are computed on the server.
- The API enforces permissions; hiding UI elements is never the only protection.
- Errors always use the `Error` body (`code`, `message` in Romanian, optional `details`).
- No secrets or `.env` in git; `.env.example` with placeholders only.
- No mock data or fallbacks in app code to make something look like it works.

---

## 4. Architecture

### Stack

Node.js 24 + Express 5 (JavaScript, CommonJS), PostgreSQL 16, Sequelize 6 + `pg`,
`sequelize-cli` for migrations/seeders, `zod` for validation (same shapes as openapi),
`swagger-ui-express` + `yaml` serving `docs/openapi.yaml` at `/api/docs`, `helmet`, `cors`,
`morgan`, `dotenv`, `multer` 2 (image upload), Jest + Supertest on a separate test database,
nodemon. Later (MVP): `jsonwebtoken`, `bcrypt`, `express-rate-limit`, `node-cron`, `nodemailer`,
`qrcode`. Exact versions are pinned when each package is added; every package is checked on npm
first.

### Structure

Three layers per module, as in the team's component diagram: **routes → controllers → services
→ repositories**. Controllers parse/validate and call a service; services hold business rules;
repositories hold the Sequelize queries. No business logic in controllers, no SQL in services.

```
src/  app.js  server.js  config/  routes/  controllers/  services/  repositories/
      models/  middleware/ (validation, errors; auth later)  jobs/ (later)
db/   schema.sql  seed.sql        uploads/ (gitignored)
tests/   docs/
```

All routes live under `/api/v1`. CORS allows the Vite dev origin.

### Data model

`db/schema.sql` (v3) and `db/seed.sql` are the first migration and the seeder, applied as they
are through `sequelize-cli`. Sequelize models mirror the tables and never `sync()` the schema.
Special constraints stay in SQL: one active booking per slot (partial unique index), no
overlapping slots per facility (exclusion constraint), payment belongs to exactly one of
booking/sanction, opening hours both-or-neither and `closes_at > opens_at`.

### Key flows

- Facilities CRUD (Lab 6): GET /sports, GET /facilities (status filter), GET/PATCH
  /facilities/{id}, POST /facilities, POST/DELETE facility images. Auth does not exist yet in
  Lab 6, so admin-only routes are open with `TODO(CB-8)`; CB-8 adds `requireRole('admin')`.
  *Changed 2026-11-20:* CB-8 arrived with the login branch (§5, 1), so the admin-only
  facility routes use `requireAuth` + `requireRole('admin')` from the start.
- Booking, payment, cancellation, scheduler: per the MVP Jira tasks (CB-21 … CB-37).

---

## 5. Decisions

### Ruled during planning

1. **schema.sql/seed.sql edited in place to v3 (one-time exception).** The context said to use
   them as they are; nothing is built or deployed yet, so the team accepted editing them
   directly instead of adding a migration. Future changes go in new migrations. Not open to
   override silently.
2. **Seed corrections made with v3:** booking 2 (free facility) is `confirmed` instead of
   `pending` (it would have been released by the 10-minute hold job and contradicts the
   contract); the open-match place payment is 4.29 (60 / 14) instead of 10.00; Dan's
   `blocked_until` equals his sanction's `ends_at` instead of NULL. Volei is the facility in
   `maintenance` (as in Figma).
3. **Local database:** docker-compose with PostgreSQL 16 for the team; the cloud dev container
   uses its locally installed PostgreSQL 16 (no Docker there).
4. **ERD rendering:** `docs/erd.puml` uses `!pragma layout smetana` so it renders with the
   PlantUML jar alone (no Graphviz).

### Decided during implementation

1. **Login and main page before the rest of M1, with the setup they need (2026-11-20).**
   Alexandru asked for the login page and the main page while `main` held only the planning
   docs, so branch `feature/CB-7-login-and-home-api` brings the minimal setup with them: CB-2
   configs, CB-3 Express server, CB-4 database, then CB-7, CB-8, CB-9 and the facilities list
   from CB-14. The rest of M1 (CB-14 details and CRUD, CB-44) builds on this setup instead of
   redoing it. *Rejected:* waiting for the setup from Albert (blocks the pages); building on
   the `demo/login-booking` branch (it skips this design: no Sequelize, cors or Swagger).
2. **Commit rules for task branches (2026-11-20).** Message
   `feat(<Jira task name>):CB-<n> -- <short description>`, several small commits per branch
   (one per step), no source file over 600 lines in a commit. `package-lock.json` is the
   exception: npm generates it and it stays in git so everybody installs the same versions.
   Each repo gets one PR into `main` for Albert's review. *Rejected:* leaving the lockfile
   out of git (installs would drift between us).
3. **The institutional email domain is configuration (2026-11-20).** `POST /auth/login`
   accepts only emails ending in `@ALLOWED_EMAIL_DOMAIN` (`.env`; `campus.test` for the seed
   accounts), otherwise 400 `VALIDATION_ERROR` on `email`. A wrong password and an unknown
   email both answer 401 `INVALID_CREDENTIALS` in the same time (bcrypt runs against a dummy
   hash). *Rejected:* hard-coding `usv.ro` (the seed accounts could not sign in).
4. **In-app password change next to the email reset (2026-11-20, CB-49).** The profile's
   "Schimbă parola" needs a change for signed-in users, which the contract did not have, so
   `POST /users/me/password` was added (current + new password, 204). A wrong current
   password answers 422 `WRONG_PASSWORD` (a business rule, like the other 422 codes); invalid
   data answers 400. New passwords have 8–72 **bytes**: bcrypt ignores what comes after 72
   bytes, so longer ones are refused instead of silently cut (`src/validation/password.js`,
   shared with the reset in CB-10). Blocked accounts may change their password. Tokens
   issued before the change stay valid until they expire (8 h): the JWT carries no password
   version. *Rejected:* only the email reset (the owner wanted both); invalidating old
   tokens now (needs a migration with a password version, a separate task).
5. **Password reset by email (2026-11-20, CB-10).** As in openapi.yaml: the reset token is
   a JWT valid 1 hour, signed with `JWT_SECRET` + the user's current password hash, so it
   stops working once the password changes, with no table for used tokens. The email (nodemailer,
   SMTP from `.env`; Ethereal in development) links to `APP_URL/resetare-parola?token=...`.
   `POST /auth/password-reset` answers 202 for any well-formed email and sends without
   waiting, so known and unknown emails answer alike; a failed send is logged, not
   retried (the user can ask again). Blocked accounts can reset too, as they can change the
   password (§5, 4). The new hash is written only if the old one is unchanged, so a link
   works once even under simultaneous requests. Tests always use nodemailer's JSON transport, even
   when `.env` has SMTP settings. *Rejected:* a `password_resets` table (the contract asks
   for none); awaiting the send (timing reveals which emails exist); logging the link
   instead of sending it (owner's choice).
6. **Facility details from Figma, through migration 2 (2026-11-24, CB-14).** The Figma
   facility form (frame "Admin – Facilități", drawer) has more than schema v3: opening hours
   per weekday with a "closed" switch, a minimum booking length, amenities ("Dotări") and a
   maintenance reason. The owner chose to store all four:
   - `facility_hours (facility_id, weekday 1–7 = Mon–Sun, is_closed, opens_at, closes_at)`:
     a facility has either all 7 days (open with hours, or closed) or none, which means no
     restriction. It replaces `facilities.opens_at` / `closes_at`; the migration copies them
     to all 7 days, then drops them. The opening-hours rule of §3 applies per weekday.
   - `facilities.min_booking_minutes`: 30, 60, 90 or 120 (default 60).
   - `facilities.amenities`: array of the enum `facility_amenity` (vestiare, nocturna, dus,
     echipament, parcare), the fixed list from Figma; a new option means a small migration.
   - `facilities.maintenance_note`: optional text shown with "În mentenanță".
   The change is a new migration (schema.sql stays v3). seed.sql has to match, because the
   seeder runs after all migrations, so it is edited to fill the new fields instead of
   `opens_at` / `closes_at` — a second, deliberate exception to "seed as-is". *Rejected:*
   keeping `opens_at` / `closes_at` as default hours with per-day exceptions (two places to
   read hours from); folding everything into a schema.sql v4 (the v3 edit was a one-time
   exception); free-text amenities and durations (Figma shows fixed choices).

---

## 6. Interface / client

REST + JSON, camelCase fields, ISO 8601 dates with time zone, pagination with `page`/`pageSize`
→ `{items, meta}`. The contract is `docs/openapi.yaml`; it is changed first, then the code.

---

## 7. Milestones

| | Scope |
| --- | --- |
| **M0** | Planning: docs, schema v3, contract update, Jira sync. |
| **M1** | Lab 6: CB-2 repo setup, CB-3 Express server, CB-4 database, CB-14 facilities API (+ status filter, soft delete), CB-44 facility images API. |
| **M2** | MVP (Jira CB): auth CB-7…10, slots CB-15, bookings CB-21…25, payments/QR/email CB-29…32, admin CB-35…37, tests CB-40, docs CB-43. Planned in detail after M1. |

**Gate for M1:** `npm run lint` and `npm test` pass; `db:reset` rebuilds the database from
scratch; the frontend admin Facilities screen creates, edits, deactivates and uploads images
against this API locally.
