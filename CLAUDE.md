@AGENTS.md

# Claude Code specifics

## Project memory

Your context doesn't survive a crash, a new session or a compaction. These two files do, so
they're the project's memory. Treat anything that isn't written in one of them as lost.

- **`docs/DESIGN.md`: what we're building and why.** It's the source of truth for every
  agreed decision. Check it before any design choice. If what you're about to do isn't
  covered there, or contradicts it, ask me first; don't improvise. It changes rarely, and
  only after we've discussed it.
- **`docs/STATUS.md`: where we are.** Milestones, bugs, open issues, deferred work, and
  "Current work" (what's in progress right now). It changes constantly. Update it as you go,
  never in a batch at the end.

They split cleanly: a decision goes in DESIGN.md, and progress or a problem goes in
STATUS.md. If you're unsure which file something belongs in, it's probably a decision, so
ask.

**Recovery.** At session start and after every compaction, read both files before doing
anything else. Resume from "Current work" in STATUS.md. Check `git status` and `git log -5`,
and if they disagree with STATUS.md, tell me before continuing.

## Subagents and models

- **`explorer` (Haiku)** handles searching the codebase, finding usages, reading large files and
  summarising how something works before a change.
- **`implementer` (Sonnet)** handles well-specified implementation, test writing and mechanical
  multi-file edits.
- **`test-runner` (Haiku)** runs the test, lint and typecheck commands and returns only a
  summary of failures. Always run checks through it, not directly in the main session, so the
  full output never lands in the main context.
- **`reviewer` (Sonnet)** reviews the uncommitted diff against AGENTS.md and DESIGN.md before
  every non-trivial commit. Fix its blocking findings before committing. If you disagree with
  a finding, raise it with me rather than overriding it.
- **`debugger` (Opus)** is only for problems that actually need it:
  - two fix attempts on the same bug have already failed;
  - concurrency, race, timing or state-synchronisation bugs;
  - a design or architecture decision that spans many modules;
  - subtle correctness reasoning (algorithms, security, data integrity).

  Say why before invoking it. Never use it for routine work.
- Subagents start cold, so give them the full context they need in the prompt: the relevant
  files, the decisions in DESIGN.md and what "done" means.
- Subagents don't edit `docs/DESIGN.md` or `docs/STATUS.md`. They report back, and the main
  session records the results in those files.

## Commit flow

1. Run `test-runner` and fix any failures.
2. For a non-trivial change, run `reviewer` and fix its blocking findings.
3. Update `docs/STATUS.md` if the change affects anything it tracks.
4. Commit and push.

## Planning phase

The planning phase ends with `docs/DESIGN.md` written and agreed, and the milestones copied
into `docs/STATUS.md`. Don't start implementation before that.
