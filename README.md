# Claude Code project template

Starting point for new projects worked on with Claude Code.

## Using it

1. Create a new repo from this template.
2. Fill in the "Project" section at the bottom of `AGENTS.md`.
3. Replace `<Project>` in `docs/DESIGN.md`. Claude writes the rest at the end of planning.
4. Add stack-specific entries to `.gitignore`, and a formatter hook to `.claude/settings.json`
   if you want one.
5. Replace this README with the project's own.

## What's where

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Tool-agnostic working agreement, plus per-project info. |
| `CLAUDE.md` | Imports `AGENTS.md`, then adds Claude Code specifics (subagents, compaction). |
| `.claude/settings.json` | Permissions: git commit/push allowed, destructive git asks, `.env` reads denied. |
| `.claude/agents/` | Subagents: `explorer` and `test-runner` (Haiku), `implementer` and `reviewer` (Sonnet), `debugger` (Opus). |
| `docs/DESIGN.md` | Decision record: what the project is, and why. |
| `docs/STATUS.md` | Milestones, bugs fixed, open issues, deferred work. |

Not in the repo: autocompact (toggle in `/config`) and personal preferences that should apply
everywhere (`~/.claude/CLAUDE.md`). Per-machine overrides go in `CLAUDE.local.md` and
`.claude/settings.local.json`, which are gitignored.
