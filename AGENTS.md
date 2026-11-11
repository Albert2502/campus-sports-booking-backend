# Working agreement

## Communication

- If anything is unclear or ambiguous, or has more than one reasonable solution, stop and ask.
  Don't guess, and don't silently pick one. This applies to requirements, design choices and
  bug fixes alike. We discuss it, then you implement what we agreed.
- When something goes wrong, report it plainly: what happened, what you tried, and what you
  think the cause is.
- Keep replies short. No long recaps of what you just did; the diff and commit messages cover that.
- Say when you're unsure. Flag anything you reasoned through but couldn't actually verify.

## Code

- Comment only what the code can't say itself: non-obvious reasons, workarounds and gotchas.
  Don't write comments that restate the line, commented-out code or changelog-style comments.
- Stay in scope. Don't refactor, rename or reformat anything outside the task. If you spot
  something worth fixing, mention it instead.
- Don't add new dependencies without asking.
- Never fake success. Don't use mock data, hardcoded fallbacks or swallowed errors to make
  something appear to work.
- Never delete, skip or weaken a failing test to get a green run. Report the failure instead.
- Check the installed versions and docs before using a library API. Don't rely on memory.
- Mark deferred work with a tagged comment, `TODO(<milestone>)` or `TODO(polish)`, and add a
  matching line in `docs/STATUS.md`.
- Don't create markdown files beyond the ones listed under "Project docs" unless asked.

## Verification

- Before committing, run the lint, typecheck and test commands (listed under "Project" below).
  If something can't be run, say so explicitly.
- Prefer verifying by running things (tests, scripts, smoke checks) over reasoning that they
  should work.

## Git

- Once work is verified, commit and push without waiting for confirmation.
- Keep commits small and focused. Use Conventional Commits: `feat:`, `fix:`, `refactor:`,
  `docs:`, `test:`, `chore:`.
- Never force-push, rewrite pushed history or amend pushed commits.
- The remote host and CI are listed under "Project" below. Push with plain `git push`. For
  anything host-specific (pull requests, releases, CI runs), ask rather than using a host CLI.

## Always ask first

- Deleting files or directories the current task didn't create.
- Database migrations, or anything that deletes or rewrites data.
- Changes to CI, deploy or infrastructure config (workflows, systemd units, reverse proxy, etc.).
- Anything touching secrets or credentials.
- Anything that contradicts a decision recorded in `docs/DESIGN.md`.

## Secrets

- Never commit `.env` files or credentials. Keep `.env.example` with placeholder values only.
- Never print secrets into output, logs or commit messages.

## Project docs

### docs/DESIGN.md: what the project is, and why

- Write it at the end of the planning phase, before implementation starts, following the
  skeleton in the file.
- Cover every decision agreed on during planning. For each one, record why it was made and
  which alternatives were rejected and why.
- If a decision changes, update its section first and add a dated note on what changed and
  why. Don't silently overwrite it.
- Record decisions made during implementation under §5 "Decided during implementation",
  with a date.

### docs/STATUS.md: where the project stands

- "Current work": update it when you start a task, and whenever its plan changes. Say what
  you're doing, which files are touched, what's done, the next step, and any blocker or open
  question. This is what a new session resumes from, so write it before starting the work,
  not after. Clear it when the task is committed.
- Milestones table: mark each milestone done, with a date, once its work is committed. Note
  any milestone done out of order, or partial work that exists but isn't reachable yet.
- Bugs found and fixed: symptom, cause and fix, grouped by area and milestone.
- Open issues, "Still to do" (deferred work, why it was deferred, and where its TODO lives),
  and "Not yet verified" (things reasoned through but not confirmed by running or looking).
- Keep it current as work progresses, not only at the end. Update it in the same commit as
  the work it describes, whenever:
  - a milestone starts or completes, or a meaningful chunk of one lands;
  - a non-trivial bug is found (add it to "Open issues") or fixed (move it to "Bugs found and
    fixed");
  - work is deferred, or something ships without being verified;
  - a session ends with unfinished work. Note exactly where things stopped.

  Bump the "Last updated" date each time.
- Keep it concise. When the bug log gets long, collapse old entries into one-line summaries.

### Session start

At the start of every session, read `docs/DESIGN.md` and `docs/STATUS.md` before doing
anything else.

## Project

<!-- Fill this in per project. It's the most valuable part of this file, so keep it current and short. -->

### Overview

<!-- One or two lines. Full detail belongs in docs/DESIGN.md. -->

### Stack

### Remote and CI

<!-- e.g. GitHub (`origin`), CI in `.github/workflows/`; or Forgejo (`origin`), CI in `.forgejo/workflows/`. -->

- Remote:
- CI:

### Commands

- Install:
- Dev:
- Build:
- Test:
- Lint / typecheck:

### Layout

<!-- Top-level directories and what lives where. -->

### Gotchas

<!-- Things that have bitten us before and will again. -->
