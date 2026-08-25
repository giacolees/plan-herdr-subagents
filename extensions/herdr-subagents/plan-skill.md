---
name: plan
description: >
  Planning workflow (V3 - cached + fresh contexts). One interactive planner session does BOTH the grilling
  (round-by-round interview, grilling skill) and the planning
  (plan.md + pointer-based todos, domain-modeling skill for CONTEXT.md/ADRs). Cached project knowledge
  in .agent/ is reused; each task keeps fresh reasoning minimal. Scout is optional.
  Sub-agent models come only from config.json routing - no per-run model prompts.
  Requires the subagents extension inside herdr.
---

# Plan (V3 — cached + fresh contexts)

**Core principle**: Keep stable project knowledge cached. Keep task reasoning fresh. Do not rely on long conversation history as memory.

## Context strategy

### Cached context (stable) — `.agent/`

```
.agent/
├── architecture.md   — project shape, agent topology, artifacts
├── conventions.md    — coding standards, pointer-contract rules
├── decisions.md      — permanent architectural decisions
└── domain.md         — workflow ubiquitous language
```

Plus product domain: `CONTEXT.md` (glossary) + `docs/adr/` (decisions) via domain-modeling skill.

Use for: architecture, conventions, established decisions, domain rules. **Keep cache small and stable.**

Avoid putting here: debugging sessions, temporary ideas, rejected approaches, task-specific reasoning.

### Fresh context (per task) — minimal

- current request (verbatim)
- relevant files for this request
- task plan (`plan.md` § + pointer contract)
- current diff

Every task starts with a clean reasoning context. History is not memory.

## The Flow

```
User Request
    ↓
Planner (interactive, one session — grilling + domain-modeling → plan.md + pointer todos)
    ↓  (optional: Planner → Scout → Worker — only for unfamiliar/large areas)
    ↓
plan.md
    ↓
Worker × N (sequential, pointer-contract — cached + plan.md + relevant source)
    ↓
Reviewer (cached + plan.md + git diff — ISC evidence + P0-P3)
    ↓
Update decisions if needed (knowledge update rule)
```

**Announce at start:** "One planning session: I'll spawn the planner which grills you, then writes the plan and todos. Cached context from `.agent/` is reused; task reasoning stays fresh."

---

## Models (fixed routing)

Sub-agent models come **only** from the extension's `config.json`: `models.default` for the base, `models.agents.<role>` per role (`planner`, `worker`, `reviewer`, `scout` …); a role without an entry falls back to `models.default`, then to the parent model. **Never ask the user about models and never prompt a model picker** — the default choice always runs. Every spawn below therefore omits `model:` so the extension resolves each role automatically.

---

## Phase 1: Quick orientation

~30s only: confirm cached context exists + tech stack relevant to the request.

```bash
ls -la .agent/ 2>/dev/null; cat .agent/architecture.md 2>/dev/null | head -30
ls -la
cat package.json 2>/dev/null | head -30
```

Enough to name a `<name>` and the artifact dir — NOT a scout pass. The planner loads `.agent/` itself.

## Artifact paths

Pick a short `<name>` (e.g. `dark-mode`). Shared directory: `.agent/plans/YYYY-MM-DD-<name>/`.

- `.agent/plans/YYYY-MM-DD-<name>/plan.md`
- `CONTEXT.md` at repo root (created lazily by the planner via domain-modeling — glossary ONLY)
- `docs/adr/NNNN-*.md` (only for hard-to-reverse decisions)
- `.agent/` — initialized from bundled templates on the first `/plan`; updated only via knowledge update rule (permanent knowledge only)

## Phase 2: Spawn the grill-and-plan planner

One session does the grilling, the docs, the plan, the todos. No pre-scout. The planner's grilling skill dispatches its own scouts for facts when needed (only for unfamiliar/large areas).

```typescript
subagent({
  name: "💬 Planner",
  agent: "planner",
  interactive: true,
  task: `Plan: <the user's request, verbatim>

Write the plan to: .agent/plans/YYYY-MM-DD-<name>/plan.md
Create todos tagged with: <name>

Cached context: .agent/architecture.md, .agent/conventions.md, .agent/decisions.md, .agent/domain.md
Grill me — one round at a time. Keep fresh context minimal.`,
});
```

The planner loads cached context first, then runs the grilling session (round-by-round, neutral options, fact-gathering to scouts only when needed), updates `CONTEXT.md`/`docs/adr/` lazily, writes the pointer-based plan.md (references `.agent/` + `CONTEXT.md`/ADRs, never re-encodes them), creates pointer-contract todos. When done the user presses Ctrl+D to close the planner session.

## Phase 3: Review plan & todos

Read `plan.md` and list todos; show the user ISCs, todo count, CONTEXT.md/ADRs created, and the routing in use. "Ready to execute?" — this is the only human gate.

## Phase 4: Execute todos — sequential workers, pointer tasks

One worker per todo, strictly sequential (commit conflicts). The worker's fresh context is tiny: cached context + `plan.md` § + pattern file + files to change + current diff.

```typescript
subagent({
  name: "🔨 Worker 1/N",
  agent: "worker",
  task: "Implement TODO-0001. Plan: .agent/plans/YYYY-MM-DD-<name>/plan.md. Cached: .agent/*.md. Follow the todo body's pointer contract (plan section, pattern file, constraints, acceptance command). Mark the todo completed when the acceptance command passes.",
});
```

Optional scout path for unfamiliar/large areas:

```
Planner → Scout (read-only, writes scout-context.md) → Worker (reads scout-context.md + plan §)
```

Use only when the planner flags unfamiliar code or the change is large. Small tasks skip scout.

**Escalation:** a worker that hits genuine ambiguity calls `caller_ping` → main session gets the notification → answer, then `subagent_resume({ sessionPath: "…", message: "…" })`; the worker continues. No guessing.

Check each worker's result before starting the next; address P0 reports immediately.

## Phase 5: Verify against the plan

```typescript
subagent({
  name: "Reviewer",
  agent: "reviewer",
  interactive: false,
  task: "Review the implementation against the plan contract: .agent/plans/YYYY-MM-DD-<name>/plan.md (read the ISC section). Cached: .agent/*.md. Check every ISC with evidence (run acceptance commands). Cross-check terms against CONTEXT.md + ADRs + .agent/domain.md. Triage P0-P3. Report.",
});
```

Triage: P0/P1 → create todos, worker fixes them, re-run the failing acceptance commands; P2/P3 note only.

## Phase 6: Knowledge update rule

After a completed task, update cached documents **only when information becomes permanent**.

Add:

- new architecture decision → `.agent/decisions.md` (and `docs/adr/` if it meets the ADR bar)
- new coding convention → `.agent/conventions.md`
- stable domain rule → `.agent/domain.md` or `CONTEXT.md`
- project structure change → `.agent/architecture.md`

Do not add:

- implementation details
- temporary fixes
- conversation summaries
- task-specific reasoning

The updater is the main session (or a follow-up planner) — not workers/reviewer. Workers/reviewers may suggest cache updates in their summary; the parent decides.

## Optimization target

Maximize:

1. Cache reuse for stable information
2. Small task-specific contexts
3. Independent agent reasoning
4. Explicit knowledge transfer

The goal is not to maximize context size. The goal is to maximize **useful** context.

## ⚠️ Done — completion checklist

1. No model prompts anywhere: every spawn used the fixed routing (`models.agents.<role>` → `models.default` → parent model).
2. Planner loaded `.agent/` cached context; fresh context stayed minimal (request + relevant files + plan + diff).
3. Planner session ran the grilling (user confirmed), wrote plan + todos — one session, no duplicate scout (scout only if unfamiliar/large).
4. Every todo body is a pointer contract (`plan §`, `pattern: path:range`, `constraints`, `acceptance:`).
5. Workers used cached + plan § + relevant source only; sequential, minimal changes.
6. CONTEXT.md glossary-only; ADRs only when warranted; plan.md references `.agent/`/CONTEXT.md/ADRs, never restates.
7. All workers closed their todos; acceptance commands + `lsp_diagnostics`/`lens_diagnostics` clean.
8. Reviewer checked each ISC with evidence; P0/P1 resolved; suggested cache updates triaged.
9. Knowledge update rule applied — permanent knowledge cached, task reasoning discarded.
