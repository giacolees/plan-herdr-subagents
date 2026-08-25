# Domain

Ubiquitous language for this project. Product-specific glossary lives in repo `CONTEXT.md` (or `CONTEXT-MAP.md`); this file defines the workflow's own terms.

## Workflow terms

**Plan** — pointer-based `plan.md` under `.agent/plans/YYYY-MM-DD-<name>/` with Intent, Behavior, Scope in/out, Effort & quality, Ideal State Criteria (ISC), Approach & key decisions, and Acceptance commands. References `CONTEXT.md`/ADRs, never duplicates them.

**ISC (Ideal State Criteria)** — atomic, binary checkable items in `plan.md`. Each has an exact acceptance command (e.g. `pnpm test src/foo.test.ts`). Verified by reviewer with evidence.

**Pointer contract** — todo body format: `Implement plan.md §X (files: ...) / Pattern: file:range / Constraints: ... / Acceptance: cmd (ISC-n)`. Worker resolves pattern from code.

**Grilling** — round-by-round design-tree interview (skill `grilling`). Frontier = questions whose prerequisites settled. No recommended answer — neutral options only.

**Domain modeling** — glossary/ADR discipline (skill `domain-modeling`). `CONTEXT.md` glossary-only, updated lazily when terms crystallise; ADRs only when hard-to-reverse + surprising + traded-off.

**Scout** — optional read-only reconnaissance (agent `scout`). Maps files, conventions, gotchas; writes `scout-context.md`. Use only for unfamiliar code or large changes.

**Worker** — pointer-task executor (agent `worker`). One todo, minimal change, runs acceptance + diagnostics, commits, closes todo. Escalates via `caller_ping` on ambiguity.

**Reviewer** — ISC-evidence verifier (agent `reviewer`). Pass/fail per ISC with `file:line` or command output; P0-P3 triage. Never fixes code.

**Herdr pane** — multiplexed terminal pane hosting a subagent. Managed via `terminal.ts`, activity sidecar, lifecycle projection.

**Todo forwarding** — cross-session import of planner todos to parent session (sidecar + live-store replay) so they survive planner close.

**Cached context** — `.agent/` (architecture, conventions, decisions, domain). Stable, reusable. Updated only with permanent knowledge after a task.

**Fresh context** — per-task: request + relevant files + plan + current diff. Starts clean; history is not memory.

_Avoid_: spec (use Plan), ticket/story (use Todo), research phase (use Scout when optional)
