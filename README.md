# Campus Sports Booking — backend

REST API (Node.js, Express, PostgreSQL) for booking campus sports facilities.
Course project, USV "Ingineria programelor".

Status: see `docs/STATUS.md`.

## Run locally

Needs Node.js 24 and PostgreSQL 16 or newer, either installed locally or run
with Docker (step 3).

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the PostgreSQL password.
3. With Docker: `docker compose up -d` starts PostgreSQL 16 on `DB_PORT`, with
   the user, password and database from `.env` (data kept in the `db-data`
   volume; `docker compose down -v` deletes it). Without Docker, use your local
   PostgreSQL and run `npm run db:create` once.
4. `npm run db:reset`: it runs the migration
   (`db/schema.sql`), the seeder (`db/seed.sql`) and gives the seed accounts the
   password `parola123`.
5. Optional: `npm run db:dev-slots` adds slots for the next 14 days, inside
   each facility's opening hours, so the calendar has something to show (the
   seed has only six slots). Running it again does not add duplicates.
6. `npm run dev`: the API answers on http://localhost:3000/api/v1 and its docs
   are on http://localhost:3000/api/docs.

Other scripts: `npm run lint`, `npm run format`, `npm run db:migrate`,
`npm run db:seed`, `npm run db:dev-passwords`, `npm run db:dev-slots`.

## Run with Docker

Needs Docker with Compose, and the frontend cloned next to this repo
(`../campus-sports-booking-frontend`).

1. Copy `.env.example` to `.env` and fill it in. Compose overrides the database
   host and port, `APP_URL` and `CORS_ORIGIN` for the containers.
2. `docker compose up -d --build` starts PostgreSQL, the API (it runs the
   migrations on start) and the frontend. The app is on http://localhost:8080,
   the API on http://localhost:3000/api/v1 and its docs on
   http://localhost:3000/api/docs.
3. Optional, run by hand once on a new database:
   `docker compose exec api npm run db:demo` loads the test data (seed, the
   password `parola123` for the seed accounts, slots for the next 14 days).
   Nothing is seeded automatically.

`docker compose down` stops everything; `docker compose down -v` also deletes
the database and the uploaded images, so `db:demo` can be run again.

## Tests

`npm test` runs Jest + Supertest against a separate database, `DB_NAME_TEST` in
`.env` (default `campus_sports_test`; the name must end in `_test`). The tests
create it if it is missing and rebuild it from the seed for every test file.

- Design and decisions: `docs/DESIGN.md`
- Progress: `docs/STATUS.md`
- API contract: `docs/openapi.yaml`
- Data model: `docs/erd.png`
- Working agreement for contributors and AI tools: `AGENTS.md`
