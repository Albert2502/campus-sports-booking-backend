# Campus Sports Booking — backend

REST API (Node.js, Express, PostgreSQL) for booking campus sports facilities.
Course project, USV "Ingineria programelor".

Status: planning in progress (see `docs/STATUS.md`). Run instructions arrive
with the first setup task (CB-2).

- Design and decisions: `docs/DESIGN.md`
- Progress: `docs/STATUS.md`
- API contract: `docs/openapi.yaml`
- Data model: `docs/erd.png`
- Working agreement for contributors and AI tools: `AGENTS.md`

## Demo (branch `demo/login-booking`)

A small demo of the API: login, one free football field with hourly slots for the
next two weeks, and booking a slot (no payment). The frontend demo lives on the
same branch name in `campus-sports-booking-frontend`.

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DB_PASSWORD` (PostgreSQL user
   `DB_USER`) and a long random `JWT_SECRET`.
3. `npm run db:reset` creates the database `DB_NAME` (it must end in `_demo`;
   the script drops and recreates it), loads `db/schema.sql` and the demo data.
   The demo accounts (one student, one admin) are listed in `db/reset-demo.js`.
4. `npm run dev` starts the API on http://localhost:3000/api/v1.

Routes in the demo: `POST /auth/login`, `GET /users/me`, `GET /facilities`,
`GET /facilities/{id}`, `GET /slots`, `GET|POST /bookings`, `GET /bookings/{id}`.
