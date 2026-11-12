# Campus Sports Booking - Backend context

Paste this file into Claude Code (or save it as `CLAUDE.md` in the backend repo), then start in **plan mode**.
Source: the team's Confluence space "Proiect_lab_IP" (pages listed at the end), read on 2026-11-12. Where Confluence is silent, this file says "TO CONFIRM" instead of guessing.

## 1. What we are building

A web platform where students and teachers of ONE university book campus sports facilities (halls, courts) without overlaps, under fairness rules. University course project ("Ingineria programelor", USV), team of 2: Galan Albert and Butnariu Alexandru. This repo is the **backend** (REST API). A separate repo holds the React frontend.

Core idea: a user books a free slot and becomes the **captain** of that booking. The captain receives a QR code, can fill the team (invitations or open match), checks in, and can cancel under rules. An administrator controls everything. A scheduler (Planificator) releases halls without check-in, closes auctions and lifts bans.

## 2. Decided stack (from the Confluence page "Tehnologii backend")

| Area | Choice |
|---|---|
| Runtime | Node.js 24 LTS, JavaScript |
| Web framework | Express 5 (async errors handled natively) |
| Database | PostgreSQL 16+ |
| ORM / driver | Sequelize 6 + `pg`; transactions for booking + payment |
| Migrations / seed | `sequelize-cli`, with `db/schema.sql` and `db/seed.sql` as SQL migrations (special constraints stay in SQL) |
| Auth | `jsonwebtoken` (JWT in `Authorization` header), `bcrypt` |
| Validation | `zod`, same shapes as `openapi.yaml` |
| API docs | `swagger-ui-express` serving `openapi.yaml` at `/api/docs` |
| Scheduler | `node-cron` |
| Email | `nodemailer` (Ethereal or similar test SMTP in development) |
| QR | `qrcode` (PNG for `GET /bookings/{bookingId}/qr`) |
| Payments | Stripe in test mode, or a simulated payment service for the MVP |
| Security | `helmet`, `cors`, `express-rate-limit` (login attempts) |
| Config | `dotenv`, secrets only in `.env` (commit `.env.example`) |
| Logging | `morgan` |
| Tests | Jest + Supertest, on a separate test database |
| Quality | ESLint, Prettier, nodemon |
| Local DB | Docker Compose (optional), PostgreSQL 16 |

Coding style: **TO CONFIRM** with Alexandru. The course lab suggests the Google JavaScript Style Guide (https://google.github.io/styleguide/jsguide.html). Until confirmed, use ESLint + Prettier and keep the choice easy to change. Code identifiers, comments and commit messages in English.

## 3. Architecture to respect

Three layers inside each module, as in the team's component diagram: **controller -> service -> repository (persistence)**. Controllers parse/validate the request and call a service; services hold the business rules; repositories hold the Sequelize queries. No business logic in controllers, no SQL in services.

Modules: Users, Slots (facilities and time slots), Bookings, Payments, Teams, Sanctions, Notifications, Scheduler. Dependencies between services in the diagram: Bookings uses Slots, Sanctions, Payments and Notifications; Teams uses Notifications; Payments talks to the external payment service; Notifications sends email; the Scheduler calls Bookings (auto-release, auction result); Sanctions can block a user in Users.

Planned layout:

```
backend/
  src/
    app.js            # Express setup (middleware, routes, error handler)
    server.js         # starts the server
    config/           # env, DB connection
    routes/           # bookings.routes.js, slots.routes.js ...
    controllers/
    services/         # monthly limit, payment, cancellation, check-in ...
    repositories/     # Sequelize queries
    middleware/       # JWT auth, roles, validation, error handling
    jobs/             # node-cron jobs
  db/                 # schema.sql, seed.sql
  tests/
  openapi.yaml
  .env.example
```

## 4. Database (PostgreSQL, tested)

`db/schema.sql` and `db/seed.sql` (version 2) already exist and load without errors on PostgreSQL 16. **Do not redesign the schema**; add migrations if something is really missing. Summary:

- Enums: `user_role` (student, teacher, admin), `account_status`, `team_join_mode` (invitation, open), `invitation_status`, `booking_status` (pending, confirmed, checked_in, cancelled, released, no_show), `participant_status`, `payment_status` (pending, accepted, declined, refunded), `bid_status`, `incident_type` (no_show, rule_violation), `lift_method`.
- Tables: `users`, `sports`, `facilities`, `time_slots`, `facility_closures`, `waiting_list`, `teams`, `team_members`, `team_invitations`, `bookings`, `booking_participants`, `incidents`, `sanctions`, `payments`, `bids`, `notifications`, `booking_rules` (single row of configurable rules).
- Constraints that enforce the rules: partial unique index allowing at most ONE active booking (pending/confirmed/checked_in) per slot; exclusion constraint forbidding overlapping `time_slots` on the same facility; one pending invitation per (team, user); a payment belongs to exactly one of booking or sanction.
- Views for the admin reports: `v_monthly_bookings`, `v_facility_stats`, `v_rental_history`, `v_open_places`.
- `booking_rules` holds the values that are still open questions: monthly limit (default 1), whether it applies to teachers, free-cancel hours (4), check-in minutes (10), incidents before sanction (2), ban months (6), unban fine amount. Read them from this table, never hard-code.
- Rules that live in the **service layer**, not in SQL: monthly limit check, 4-hour free cancellation for unpaid bookings, check-in window, blocked-account check, release/no-show at start time, auction winner.

## 5. Business rules (from the requirements page)

- Roles: student, teacher, administrator. "Captain" is a role of a booking (the user who made it), not an account type.
- Login; an admin can block ONE specific account (not all students).
- Calendar of availability and filters (sport, date, time, free places). "No filtering" is not acceptable to the beneficiary.
- Booking: free slot, no overlaps, slot held temporarily until payment completes; declined payment releases the slot; "slot taken meanwhile" returns a clear error.
- History of bookings and "book again" (prefill from the last booking, re-check availability).
- Monthly limit: 1 booking per month for students (teachers: OPEN). Above the limit a student may bid (auction rules OPEN).
- Free cancellation up to 4 hours before start if the booking is unpaid; paid bookings: OPEN.
- Online payment, confirmation by email. QR code sent to the captain only.
- Open match / free places in a rented court (others join and pay), direct invitations, team size depends on the sport; the captain decides who joins.
- Check-in up to 10 minutes before start; if the start time passes without check-in the hall is released automatically and a no-show is recorded.
- Sanctions: a second consecutive incident (no-show or rule violation) blocks the account; unban after 6 months or by paying a fine.
- Admin: reports (profit, rental history, most rented, most profitable), cancel any booking, book with priority (cancels the existing booking and notifies the user; refund policy OPEN).
- Out of scope for v1: multiple universities, native mobile apps, tournaments/leagues, memberships, coaching. Waiting list and maintenance closures exist in the schema but are optional.

Open questions (do not invent answers; keep them configurable): teacher vs student differences, auction rules, exact sanction rule, what is paid online and which payment method, refunds, what happens to users displaced by an admin.

## 6. API contract

The REST API was designed in Swagger Editor by the team. The file is attached to the Confluence page "Document swagger" and is NOT readable from this context. **Ask the user to add `openapi.yaml` to the repo root** and treat it as the source of truth for routes and payloads. Routes already mentioned elsewhere: `GET /bookings/{bookingId}/qr`, docs at `/api/docs`. If `openapi.yaml` is missing, propose routes in the plan and wait for confirmation.

## 7. Current course milestone (Lab 6)

Deliverables due at Lab 7:
1. Backend repo on the team's GitHub organization, with code on the main branch.
2. An initial backend app with **CRUD for one entity from the database** (suggested: `facilities`, with `sports` as a related table), connected to PostgreSQL.
3. Integration with the frontend, demoed locally.

So the first scope is deliberately small: project skeleton, DB connection, health endpoint, CRUD for `facilities`, `/api/docs`, CORS for the frontend's dev origin, one or two Jest/Supertest tests, README with run steps. Auth, bookings, payments and the scheduler come later.

### Next milestone (Lab 7, due Lab 8): the MVP backend

- Build the backend MVP following the tasks in the team's Jira project **TEC** (https://techthieves-jira.atlassian.net, read on 2026-11-12; all tasks were "To Do", unassigned). Use the Jira key in branch names, e.g. `feature/TEC-7-auth-login`, and keep the Jira status updated. Backend tasks, grouped by epic:

  **TEC-1 Project and database setup (foundation)**
  - TEC-2 (shared) init repository structure, README, `.gitignore`, shared ESLint + Prettier; `npm run dev` and `npm run lint` must work. NOTE: Jira says one repo with `backend/` and `frontend/` folders, but the team created two repositories (the lab asks for two); adapt this task to two repos.
  - TEC-3 Express server: `app.js` with helmet, cors, morgan, `express.json`; routes under `/api/v1`; error middleware that answers in the `Error` format from `openapi.yaml` (`code`, message); docs at `/api/docs`; `GET /api/v1/health` returns 200; an unexpected error returns 500 with code `INTERNAL_ERROR`.
  - TEC-4 PostgreSQL, migrations, seed: docker-compose for PostgreSQL, `.env` and `.env.example`, `schema.sql` and `seed.sql` used exactly as they are as the first migrations, Sequelize connection; `npm run db:migrate`, `npm run db:seed`; a script `db:dev-passwords` sets real bcrypt hashes (password `parola123`) for the seed accounts, whose hashes are fake (e.g. `ana@campus.test`).

  **TEC-6 Authentication and roles**
  - TEC-7 `POST /auth/login`: institutional email + password (bcrypt), JWT valid 8 hours, returns token and profile. 200 / 401 `INVALID_CREDENTIALS` / 400 `VALIDATION_ERROR` (email from another domain).
  - TEC-8 Auth middleware: verify JWT, set `req.user`, `requireRole('admin')`. 401 `UNAUTHORIZED`, 403 `FORBIDDEN`; tested on an admin route.
  - TEC-9 `GET /users/me`: profile, account status, `bookingsThisMonth`, `monthlyLimit` (null for teachers if the limit does not apply to them).
  - TEC-10 Password reset by email: `POST /auth/password-reset` (always 202, even for unknown emails) and `POST /auth/password-reset/confirm`; token is a signed JWT valid 1 hour, bound to the current password hash (no new table); expired or used token returns 410 `RESET_TOKEN_INVALID`.

  **TEC-13 Facilities, calendar and filters**
  - TEC-14 `GET /sports`, `GET /facilities` (filter by sport, active only), `GET /facilities/{facilityId}` (404 `NOT_FOUND`); responses follow `openapi.yaml`.
  - TEC-15 `GET /slots` with `availability` (free, occupied, closed) computed from active bookings and maintenance closures; combinable filters: sport, facility, date or range, start/end time, only free; under 500 ms on the test data.

  **TEC-20 Bookings**
  - TEC-21 `POST /bookings`, in ONE transaction: account not blocked (403 `ACCOUNT_BLOCKED`), monthly limit from `booking_rules` (422 `MONTHLY_LIMIT_REACHED` with `auctionAvailable`), slot free and in the future (409 `SLOT_TAKEN` for concurrent requests), team's sport; creates the booking `pending` if the facility requires payment, otherwise `confirmed`; the requester becomes captain.
  - TEC-22 Temporary hold: a `pending` booking holds the slot 10 minutes (`holdExpiresAt`, computed from `created_at`); a node-cron job every minute marks unpaid expired bookings `released` and never touches `confirmed` ones.
  - TEC-23 `GET /bookings` (own bookings as captain or participant, scope upcoming/past, pagination with `meta.total`; admin sees all) and `GET /bookings/{bookingId}` (403 for someone else's booking).
  - TEC-24 `POST /bookings/{bookingId}/cancel`: captain cancels free of charge at least `freeCancelHours` (4) before start if unpaid; 422 `CANCEL_WINDOW_PASSED`, 409 `ALREADY_CANCELLED`; slot becomes free; participants notified.
  - TEC-25 `GET /rules` (public) and `PUT /rules` (admin only): monthly limit, whether it applies to teachers, free-cancel hours; a change applies immediately to `POST /bookings`.

  **TEC-28 Payments, confirmation email and QR**
  - TEC-29 `PaymentProvider` module with `charge(amount, token)`, Stripe in test mode or a simulated service; keys in `.env`; no card data ever stored.
  - TEC-30 `POST /bookings/{bookingId}/payments`: amount computed on the server; accepted -> booking `confirmed`, QR generated, email sent; declined -> 402 `PAYMENT_DECLINED` and the slot is released; second payment -> 409 `ALREADY_PAID`; saved in `payments` with the right status.
  - TEC-31 QR code: unique `qr_code` per booking, PNG via `qrcode` at `GET /bookings/{bookingId}/qr`, captain only (403 for anyone else), no repeated codes.
  - TEC-32 Email notification service: nodemailer with templates for confirmation (QR attached) and cancellation; every email is logged in `notifications`; a failed email must not cancel the booking, it is retried; tested with Ethereal.

  **TEC-34 Administration**
  - TEC-35 `GET /users` and `GET /users/{userId}` for admin: filters by role, status, search by name or email, pagination.
  - TEC-36 `POST /users/{userId}/sanctions` blocks only that account; `PATCH /sanctions/{sanctionId}` unblocks (`lift_method = admin`); `users.status` and `blocked_until` updated in the same transaction; the blocked user gets 403 `ACCOUNT_BLOCKED` on booking.
  - TEC-37 Admin can cancel any booking (extends the cancel endpoint): reason required (400 `VALIDATION_ERROR`), `cancelled_by` keeps the admin, captain notified, accepted payments become `refunded`.

  **TEC-39 Testing and MVP delivery**
  - TEC-40 Jest + Supertest on a test database: double booking, monthly limit, blocked account, cancellation within 4 hours, declined payment releases the slot; every error code above has at least one test.
  - TEC-43 (shared) README with run steps, `.env.example`, test accounts and a 5-minute demo script (a booking from scratch in under 3 minutes).

  Not in the MVP (no Jira tasks): teams and invitations, open match, check-in, auctions, automatic sanctions, reports, unban by fine, waiting list. The schema already supports them.

  Conventions visible in Jira: API prefix `/api/v1`; consistent error body with a machine-readable `code`; business rules read from `booking_rules`; money amounts computed on the server.
- Backend and frontend are developed **separately**; integration is not required at this stage.
- Deliverables: code for each task on its own branch in the GitHub repo, and a demo of the working features to the lab coordinator.
- Later (Lab 8): code review. At least two review comments must be received and addressed in a GitHub pull request, so keep PRs small and readable and open them for the teammate.

## 8. Rules for AI-assisted development (course requirement, Lab 7)

The human is the author and answers for every line.
1. Small, verifiable steps: one function, endpoint or test at a time, not the whole app in one go.
2. Explain non-obvious code; do not add things the user cannot explain in a code review.
3. Compile and run after every change; write tests (unit and integration) before trusting the code, including edge cases: nonexistent id, empty body, invalid data, unauthenticated user. A test that only repeats a mock proves nothing.
4. Check every npm package before adding it: it must exist, be maintained, and have the right version. Never invent packages, methods or parameters.
5. Read the whole diff of each commit; do not touch files that were not mentioned, and never remove a validation just to make a test pass.
6. Prefer the simplest solution; no speculative abstractions.
7. Commit small and often with clear messages, before each AI session, so any step can be undone.
8. Architecture stays a human decision: respect the layers and modules above; ask when unsure.
9. Never send passwords, API keys, `.env` contents or personal data to external tools.

## 9. Git and working rules (course requirements)

- One branch per task, named after the task (e.g. `feature/facilities-crud`); open a pull request into `main`; the teammate reviews; merge after approval; pull `main` and test locally before starting the next branch.
- Work on one task at a time; keep the Jira status updated (project in the team's Jira).
- A task is done only when it is merged into `main` and nothing regressed.
- Do not commit secrets or `.env`.
- Ask before making decisions that the Confluence pages leave open.

## 10. How to start (plan mode)

Enter plan mode and produce a plan for the **Lab 6 scope in section 7 only**, using the stack and layering above. The plan should list: files to create, `package.json` scripts and dependencies, how `schema.sql`/`seed.sql` are applied through sequelize-cli, the `facilities` endpoints and zod schemas, the tests, the README, and the git branch and PR sequence. List what you need from the user (for example `openapi.yaml`, a local PostgreSQL connection string, the confirmed style guide). Work in the small, reviewable steps of section 8, one branch and PR per task. Do not write code until the plan is approved. After the Lab 6 scope, plan the MVP tasks from section 7 the same way.

## Sources (Confluence space "Proiect_lab_IP")

"Lab 2 - Cerinte de produs", "Diagrama cazurilor de utilizare", "Descrierea cazurilor de utilizare complexe", "Diagrama de componente / secvente / stari / domeniu / ERD" (images, not readable as text), "Tehnologii backend", "Document swagger" (attached file), "Link Jira".
