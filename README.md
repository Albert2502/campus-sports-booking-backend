# Campus Sports Booking — backend

REST API (Node.js, Express, PostgreSQL) for booking campus sports facilities.
Course project, USV "Ingineria programelor".

Status: see `docs/STATUS.md`.

## Run locally

Needs Node.js 24 and PostgreSQL 16 or newer.

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the PostgreSQL password.
3. `npm run db:create` (once), then `npm run db:reset`: it runs the migration
   (`db/schema.sql`), the seeder (`db/seed.sql`) and gives the seed accounts the
   password `parola123`.
4. `npm run dev`: the API answers on http://localhost:3000/api/v1 and its docs
   are on http://localhost:3000/api/docs.

Other scripts: `npm run lint`, `npm run format`, `npm run db:migrate`,
`npm run db:seed`, `npm run db:dev-passwords`.

- Design and decisions: `docs/DESIGN.md`
- Progress: `docs/STATUS.md`
- API contract: `docs/openapi.yaml`
- Data model: `docs/erd.png`
- Working agreement for contributors and AI tools: `AGENTS.md`
