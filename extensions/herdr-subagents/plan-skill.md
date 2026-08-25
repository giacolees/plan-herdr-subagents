---
name: plan
description: >
  Planning workflow (V2 - grill-and-plan). One interactive planner session does BOTH the grilling
  (round-by-round interview, grilling skill) and the planning
  (plan.md + pointer-based todos, domain-modeling skill for CONTEXT.md/ADRs). No scout up front.
  Sub-agent models come only from config.json routing - no per-run model prompts.
  Requires the subagents extension inside herdr.
---

# Plan (V2)

A single interactive **grill-and-plan** session: the planner interviews you round-by-round until the design tree is empty, pins crystallised terms/decisions into `CONTEXT.md`/ADR (sparse), writes a pointer-based `plan.md`, creates pointer-contract todos. Then sequential workers implement, a reviewer verifies against the plan's ISC. Nothing is written twice — and **models are fixed**: per-role routing from `config.json`, the default choice always runs, no per-run model UI.

**Announce at start:** "One planning session: I'll spawn the planner which grills you, then writes the plan and todos."

## The Flow

```
Phase 1: Quick orientation (main session, ~30s)
    ↓
Phase 2: Planner (interactive, one session) — grilling + plan + todos
    ↑   (planner dispatches its own scouts for facts mid-session)
    ↓
Phase 3: Review plan + todos (main session, with the user)
    ↓
Phase 4: Execute todos (sequential workers, pointer tasks)
    ↓
Phase 5: Reviewer against ISC/acceptance commands
```

---

## Models (fixed routing)

Sub-agent models come **only** from the extension's `config.json`: `models.default` for the base, `models.agents.<role>` per role (`planner`, `worker`, `reviewer`, …); a role without an entry falls back to `models.default`, then to the parent model. **Never ask the user about models and never prompt a model picker** — the default choice always runs. Every spawn below therefore omits `model:` so the extension resolves each role automatically.

---

## Phase 1: Quick orientation

~30s only: tech stack + shape of the repo relevant to the request.

```bash
ls -la
find . -type f -name "*.ts" | head -20  # or relevant extension
cat package.json 2>/dev/null | head -30
```

Enough to name a `<name>` and the artifact dir — NOT a scout pass. The planner reads code itself.

## Artifact paths

Pick a short `<name>` (e.g. `dark-mode`). Shared directory: `.pi/plans/YYYY-MM-DD-<name>/`.

- `.pi/plans/YYYY-MM-DD-<name>/plan.md`
- `CONTEXT.md` at repo root (created lazily by the planner via domain-modeling — glossary ONLY)
- `docs/adr/NNNN-*.md` (only for hard-to-reverse decisions)

## Phase 2: Spawn the grill-and-plan planner

One session does the grilling, the docs, the plan, the todos. No pre-scout. The planner's grilling skill dispatches its own scouts for facts when needed.

```typescript
subagent({
  name: "💬 Planner",
  agent: "planner",
  interactive: true,
  task: `Plan: <the user's request, verbatim>

Write the plan to: .pi/plans/YYYY-MM-DD-<name>/plan.md
Create todos tagged with: <name>

Grill me — one round at a time.`,
});
```

The planner runs the grilling session (round-by-round, recommended answers, fact-gathering to sub-agents), updates `CONTEXT.md`/`docs/adr/` lazily, writes the pointer-based plan.md, creates pointer-contract todos. When done the user presses Ctrl+D to close the planner session.

## Phase 3: Review plan & todos

Read `plan.md` and list todos; show the user ISCs, todo count, CONTEXT.md/ADRs created, and the routing in use. "Ready to execute?" — this is the only human gate.

## Phase 4: Execute todos — sequential workers, pointer tasks

One worker per todo, strictly sequential (commit conflicts). The worker task is a **pointer**: the todo body carries the pointer contract.

```typescript
subagent({
  name: "🔨 Worker 1/N",
  agent: "worker",
  task: "Implement TODO-0001. Plan: .pi/plans/YYYY-MM-DD-<name>/plan.md. Follow the todo body's pointer contract (plan section, pattern file, constraints, acceptance command). Mark the todo closed when the acceptance command passes.",
});
```

**Escalation:** a worker that hits genuine ambiguity calls `caller_ping` → main session gets the notification → answer, then `subagent_resume({ sessionPath: "…", message: "…" })`; the worker continues. No guessing.

Check each worker's result before starting the next; address P0 reports immediately.

## Phase 5: Verify against the plan

```typescript
subagent({
  name: "Reviewer",
  agent: "reviewer",
  interactive: false,
  task: "Review the implementation against the plan contract: .pi/plans/YYYY-MM-DD-<name>/plan.md (read the ISC section). Check every ISC with evidence (run acceptance commands). Cross-check terms against CONTEXT.md + ADRs. Triage P0-P3. Report.",
});
```

Triage: P0/P1 → create todos, worker fixes them, re-run the failing acceptance commands; P2/P3 note only.

## ⚠️ Done — completion checklist

1. No model prompts anywhere: every spawn used the fixed routing (`models.agents.<role>` → `models.default` → parent model).
2. Planner session ran the grilling (user confirmed), wrote plan + todos — one session, no duplicate scout.
3. Every todo body is a pointer contract (`plan §`, `pattern: path:range`, `constraints`, `acceptance:`).
4. CONTEXT.md glossary-only; ADRs only when warranted; plan.md references, never restates them.
5. All workers closed their todos; acceptance commands passed.
6. Reviewer checked each ISC with evidence; P0/P1 resolved.