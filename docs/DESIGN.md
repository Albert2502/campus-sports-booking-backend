# <Project> — design record

Everything agreed with the owner before implementation started. This is the reference for
what the project *is* and *why*. When a decision here changes, change it here first, with a
dated note on what changed and why.

> **Status:** agreed YYYY-MM-DD. Milestones in §7; progress in `docs/STATUS.md`.

---

## 1. What it is

<!-- A few sentences: what it does, who it's for, and how it's run and deployed. Mention
sibling projects it shares structure with, if any. -->

## 2. Names and glossary

<!-- Canonical names for domain concepts. Use these in code identifiers, UI copy and docs
alike. Delete this section if the project has no naming decisions. -->

| Term | Meaning / notes |
| --- | --- |
| | |

---

## 3. Agreed requirements

<!-- The behaviour agreed during planning, grouped by area. Note the default for every
setting and the alternatives on offer. Bold anything that's binding. -->

### <Area>

- **<Decision>** — what it is. *Why:* ... *Rejected:* ... (and why)

### Non-negotiables

<!-- Hard constraints: things that must always / never happen. -->

-

---

## 4. Architecture

<!-- Stack, module layout and dependency direction, core data model, and how state flows.
Include short code sketches for key types where they clarify things. -->

### Stack

### Structure

### Data model

### Key flows

---

## 5. Decisions

### Ruled during planning

<!-- Ambiguities or collisions where a call had to be made. Numbered, so they can be referred
to. Mark whether each one is open to override. -->

1. **<Ruling>** — reasoning.

### Decided during implementation

<!-- Add a dated subsection per decision: the problem that forced it, what was decided, why,
and what it rules out. -->

#### YYYY-MM-DD: <decision>

---

## 6. Interface / client

<!-- UI, API or CLI surface: layout, the main interaction rules, and any deliberate
departures from sibling projects (with the reason). Delete if not applicable. -->

---

## 7. Milestones

| | Scope |
| --- | --- |
| **M0** | Skeleton: repo layout, tooling, config, deploy unit, README, `docs/`. |
| **M1** | |
| **M2** | |

**Gate for M1:** <the concrete check that proves M1 works, e.g. an end-to-end test>.

<!-- If milestone order changes, note it here with the reason and any hazard it introduces. -->
