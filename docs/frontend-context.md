# Campus Sports Booking - Frontend context

Paste this file into Claude Code (or save it as `CLAUDE.md` in the frontend repo), then start in **plan mode**.
Source: the team's Confluence space "Proiect_lab_IP" and the Figma wireframe, read on 2026-11-12. Where nothing is decided, this file says "TO CONFIRM" or marks a proposal.

## 1. What we are building

A web platform where students and teachers of ONE university book campus sports facilities (halls, courts) without overlaps, under fairness rules. University course project ("Ingineria programelor", USV), team of 2: Galan Albert and Butnariu Alexandru. This repo is the **frontend** (single-page web app). A separate repo holds the Node.js/Express REST API (PostgreSQL).

The user who books becomes the **captain** of that booking: receives the QR code, fills the team (invitations or open match), checks in, cancels. An administrator controls everything and sees reports. Most users book from a phone, so the app must be **responsive, mobile first**. Native apps are out of scope.

## 2. Stack

The Confluence page "Tehnologii frontend" currently contains a copy of the backend text, so **no frontend stack is documented yet**. The course lab only requires a SPA. Proposal, to be confirmed with Alexandru and then written into that page:

| Area | Proposal |
|---|---|
| Framework | React (current stable) with Vite, plain JavaScript (same language as the backend) |
| Routing | React Router |
| Server state | TanStack Query (caching, loading and error states) |
| HTTP | `fetch` wrapper or Axios, base URL from `VITE_API_URL`, JWT in the `Authorization` header |
| Forms / validation | React Hook Form + zod (same shapes as the API's `openapi.yaml`) |
| Dates and calendar | `date-fns`; a calendar component for availability (library TO CONFIRM) |
| Styling | CSS Modules or Tailwind (TO CONFIRM); mobile-first, no heavy UI kit needed |
| QR display | render the QR image from the API (`GET /bookings/{bookingId}/qr`) |
| Quality | ESLint, Prettier |
| Tests | Vitest + React Testing Library (optional for the first milestone) |

Coding style: **TO CONFIRM** with Alexandru. The course lab suggests the Google JavaScript Style Guide (https://google.github.io/styleguide/jsguide.html). Code identifiers, comments and commit messages in English. UI language: TO CONFIRM (the Figma wireframe is in English; the users are Romanian).

## 3. Backend contract

The API is described in `openapi.yaml`, designed in Swagger Editor by the team, and served by the backend at `/api/docs`. The file is attached to the Confluence page "Document swagger" and is not readable from this context. **Ask the user for it** (or for the backend repo) and treat it as the source of truth for routes and payloads. Auth is JWT; roles are `student`, `teacher`, `admin`. Booking states: `pending`, `confirmed`, `checked_in`, `cancelled`, `released`, `no_show`. Do not call routes that are not in the contract; propose them in the plan instead.

## 4. Screens (Figma wireframe by Galan Albert)

File: https://www.figma.com/design/8wxyYBE8UzOIg4XVAWGnF7 ("Campus Sports Booking - Wireframe (Galan Albert)"), 13 frames at 1280x800, page "Wireframe". Alexandru has his own Figma pages (user page and administrator page), linked in the Confluence page "Link-uri Figma"; the links are not readable from here.

| # | Screen | Notes |
|---|---|---|
| 1 / 1b | Login / blocked account | blocked users see a clear message and cannot book |
| 2 | Calendar and filters | filters: sport, date, time, free places; free and taken slots per facility |
| 3 / 3b | Slot details / monthly limit reached | at the limit the user is offered a bid (auction) |
| 4 / 4b | Payment / payment declined | declined payment releases the slot |
| 5 | Booking confirmed | shows the QR code for the captain |
| 6 | My bookings | history, cancel (free up to 4 hours before for unpaid bookings), book again |
| 7 / 7b | Check-in / check-in missed | allowed only in the 10 minutes before start; missed means the hall is released and a no-show is recorded |
| 8 | Team and invitations | open match, free places, invite players, captain accepts or rejects |
| 9 | Administrator dashboard | profit, rental history, most rented, most profitable, cancel any booking |

Note: the Jira tasks use a different, numbered screen set (00 Welcome, 01 Login, 02 Calendar, 02a Pick a date, 03 Facility details, 04 Summary and payment, 05 Booking confirmed, 06 My bookings, A2/A3 admin) that comes from the team's Figma **prototype**. When this wireframe and the prototype differ, the prototype wins; ask the user for the prototype link (Confluence pages "Link prototip" and "Link-uri Figma").

Screens 3b, 4, 4b, 7, 7b and 8 were built but not reviewed visually; check them in Figma before implementing.

## 5. Behaviour the UI must respect

- Show only what the role needs (student, teacher, administrator); hide menus the role cannot use, but never rely on hiding: the API enforces permissions.
- Always handle loading, empty, error and "slot taken meanwhile" states.
- Filters are required; "no filters" is not acceptable to the beneficiary.
- Rules such as the monthly limit, the 4-hour cancellation window and the check-in window come from the backend; the frontend shows the server's answer and may display the times, but does not decide.
- QR code goes to the captain only.
- Open questions (do not invent answers): teacher vs student differences, auction rules, what is paid online and how, refunds, what happens to users displaced by an admin.

## 6. Current course milestone (Lab 6)

Deliverables due at Lab 7:
1. Frontend repo on the team's GitHub organization, with code on the main branch.
2. An initial frontend app with **CRUD for one entity** (suggested: `facilities`), calling the backend.
3. Integration with the backend, demoed locally.

So the first scope is small: Vite + React skeleton, router with a layout, an API client module, a Facilities list page, a create/edit form, delete with confirmation, loading and error states, a `.env.example` with `VITE_API_URL`, and a README with run steps. Login, calendar, booking and the admin dashboard come later.

### Next milestone (Lab 7, due Lab 8): the MVP frontend

- Build the frontend MVP following the tasks in the team's Jira project **TEC** (https://techthieves-jira.atlassian.net, read on 2026-11-12; all tasks were "To Do", unassigned). Use the Jira key in branch names, e.g. `feature/TEC-11-login-screen`, and keep the Jira status updated. The Jira tasks also **fix part of the stack**, which overrides the proposal in section 2 where they differ: Vite + React, React Router, **axios** client (`baseURL /api/v1`, token added automatically), TanStack Query, React Hook Form + zod, `react-day-picker` with the Romanian locale, `tokens.css` with the values from Figma, the **Gentium Plus** font, Vitest + React Testing Library. **The UI is in Romanian** (error messages too). Screens follow the numbered prototype screens (00 to 06, plus admin A2 and A3), on mobile (390 px) and desktop (1440 px). Frontend tasks, grouped by epic:

  **TEC-1 Project setup**
  - TEC-2 (shared) init repository structure, README, shared ESLint + Prettier. NOTE: Jira says one repo with `backend/` and `frontend/` folders, but the team created two repositories (the lab asks for two); adapt this task.
  - TEC-5 React app: Vite + React, React Router, axios client, TanStack Query, `tokens.css`, Gentium Plus, layout with a bottom bar on mobile and a top bar on desktop. Acceptance: runs and shows the empty layout at 390 px and 1440 px; colours and font come from CSS variables; `/api` requests reach the backend through the Vite proxy.

  **TEC-6 Authentication and roles**
  - TEC-11 Screen 01 Login: form from Figma (React Hook Form + zod), errors under the fields in Romanian, token kept in `AuthContext`, logout; after login opens screen 00.
  - TEC-12 Protected routes and role menus: `ProtectedRoute` for signed-in users, `AdminRoute` for admins; admin menus hidden from other roles; an anonymous visitor is sent to `/login`; a student opening `/admin` sees a forbidden page.

  **TEC-13 Facilities, calendar and filters**
  - TEC-16 Screen 00 Welcome: account status, remaining bookings this month, three suggested facilities, "Închiriază un teren" button; data from `GET /users/me` and `GET /facilities`.
  - TEC-17 Screen 02 Calendar and filters: 7-day strip, filter buttons, facility cards with their slots; on desktop a facilities x hours table; changing the day or a filter reloads the slots; taken slots cannot be selected; layout follows the prototype on both devices.
  - TEC-18 Panel 02a Pick a date: monthly calendar (`react-day-picker`, Romanian locale), bottom sheet on mobile and a small dialog on desktop; past days not selectable; closes with x, with "Alege data" or by clicking outside.
  - TEC-19 Screen 03 Facility details: image, details, slot grid for the chosen day, the monthly-limit text (from `/users/me` and `/rules`) and the "Rezervă" button, inactive until a free slot is chosen.

  **TEC-20 Bookings**
  - TEC-26 Screen 05 Booking confirmed: booking details, QR code (shown to the captain only), free-cancellation deadline, cancel with confirmation; after cancelling shows the "Anulată" state.
  - TEC-27 Screen 06 My bookings: tabs "Viitoare" and "Istoric", cards on mobile and a table on desktop; each booking opens screen 05; past bookings only in History; status labels match `BookingStatus`.

  **TEC-28 Payments, email and QR**
  - TEC-33 Screen 04 Summary and payment: booking summary, payment form (Stripe Elements or a test form), "Pasul 2 din 3" indicator, error messages; success goes to screen 05; a declined payment shows the message and lets the user pick another slot.

  **TEC-34 Administration**
  - TEC-38 Admin screens: bookings table with cancel and reason (A2), users table with Block / Unblock (A3), form for the monthly limit; actions ask for confirmation; tables have filters and pagination.

  **TEC-39 Testing and MVP delivery**
  - TEC-41 Frontend tests (Vitest + RTL): login -> calendar -> booking -> simulated payment -> confirmation passes with a simulated API; error messages appear for 409 and 422 responses.
  - TEC-42 Phone and desktop check: compare implemented screens with the Figma prototype at 390 px and 1440 px; no horizontal scroll on phones; check diacritics and contrast; differences noted and fixed.
  - TEC-43 (shared) README, `.env.example`, test accounts and a 5-minute demo script.

  Not in the MVP (no Jira tasks): teams and invitations, open match, check-in, auctions, reports. Backend error codes the UI must handle: `SLOT_TAKEN` (409), `MONTHLY_LIMIT_REACHED` (422, with `auctionAvailable`), `ACCOUNT_BLOCKED` (403), `PAYMENT_DECLINED` (402), `CANCEL_WINDOW_PASSED` (422), `ALREADY_CANCELLED` (409), `UNAUTHORIZED` (401), `FORBIDDEN` (403).
- Backend and frontend are developed **separately**; real integration is not required at this stage, so a small mock API layer (or fixtures) behind the API client module is acceptable and should be easy to swap for the real backend.
- Deliverables: code for each task on its own branch in the GitHub repo, and a demo of the working features to the lab coordinator.
- Later (Lab 8): code review. At least two review comments must be received and addressed in a GitHub pull request, so keep PRs small and readable and open them for the teammate.

## 7. Rules for AI-assisted development (course requirement, Lab 7)

The human is the author and answers for every line.
1. Small, verifiable steps: one component, hook or page at a time, not the whole app in one go.
2. Explain non-obvious code; do not add things the user cannot explain in a code review.
3. Build and run after every change; test the edge cases the UI can hit: empty list, loading, server error, invalid input, unauthenticated user. A test that only repeats a mock proves nothing.
4. Check every npm package before adding it: it must exist, be maintained, and have the right version. Never invent packages, props or APIs.
5. Read the whole diff of each commit; do not touch files that were not mentioned, and never remove a check just to make a test pass.
6. Prefer the simplest solution; no speculative abstractions or libraries.
7. Commit small and often with clear messages, before each AI session, so any step can be undone.
8. Structure (pages, components, state) is a human decision: ask when unsure.
9. Never send passwords, API keys, `.env` contents or personal data to external tools.

## 8. Git and working rules (course requirements)

- One branch per task, named after the task (e.g. `feature/facilities-page`); pull request into `main`; the teammate reviews; merge after approval; update `main` and test locally before the next branch.
- Work on one task at a time; keep the Jira status updated.
- A task is done only when it is merged into `main` and nothing regressed.
- Never commit secrets or `.env`.
- Ask before deciding anything that the Confluence pages leave open.

## 9. How to start (plan mode)

Enter plan mode and produce a plan for the **Lab 6 scope in section 6 only**. List: the Vite project setup, folder structure (pages, components, api, hooks), dependencies, the Facilities pages and the API calls they need, loading/error handling, CORS and `VITE_API_URL` setup against the local backend, the README, and the branch and PR sequence. List what you need from the user (`openapi.yaml` or the backend repo, confirmed stack and style guide, UI language). Work in the small, reviewable steps of section 7, one branch and PR per task. Do not write code until the plan is approved. After the Lab 6 scope, plan the MVP tasks from section 6 the same way.

## Sources (Confluence space "Proiect_lab_IP" and Figma)

"Lab 2 - Cerinte de produs", "Diagrama cazurilor de utilizare", "Descrierea cazurilor de utilizare complexe", "Link-uri Figma", "Document swagger" (attached file), "Tehnologii frontend" (contains backend text by mistake), the Figma wireframe file above.
