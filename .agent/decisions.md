# Decisions

Permanent architectural decisions. See `docs/adr/` for full ADRs (when the 3-criteria bar is met).

## D1 — Single-package bundle (2026-08-25)

**Decision**: Vendor `herdr-subagents` + `grilling`/`domain-modeling` skills in-package; load `rpiv-todo`/`pi-lens` from `node_modules` via `bundledDependencies`.

**Why**: Five-package choreography was brittle across machines. One `pi install` tarball with pinned baselines.

**Consequences**: Update baselines by bumping `dependencies` → `npm install` → re-vendor if vendored → `CHANGELOG.md`.

## D2 — Vendored herdr-subagents (not node_modules)

**Decision**: Extension loaded from `extensions/herdr-subagents/index.ts` (vendored fork), not `node_modules/pi-herdr-subagents/...`.

**Why**: V2 prompts (planner exit-gate, neutral grilling, pointer-contract, `Do not suggest recommended answer`) must ship with package even when upstream npm lags.

## D3 — Fixed model routing via config.json

**Decision**: No per-run model picker. `config.json` `models.default` → `models.agents.<role>` is authoritative.

**Why**: Deterministic, cache-friendly spawns; planner never asks "which model?".

## D4 — Pointer-based plans & todos

**Decision**: `plan.md` references `CONTEXT.md`/ADRs (never restates); todo bodies are pointers (`plan §` + `pattern: file:range` + `constraints` + `acceptance: cmd`).

**Why**: Single source of truth, small contexts, workers resolve patterns from code not prose.

## D5 — Todo forwarding via sidecar (planner-todo-forward)

**Decision**: Planner todos dumped to sidecar + imported to parent session live store.

**Why**: Planner session is ephemeral (`interactive: true`); without forwarding, todos die on close.

## D6 — Sequential workers, no worker spawning

**Decision**: Workers `spawning: false`, executed sequentially; only planner may spawn scouts.

**Why**: Avoid commit conflicts and reasoning sprawl; scout is optional (unfamiliar/large changes only).

## D7 — Cached vs fresh context split (V3, 2026-08-25)

**Decision**: `.agent/` holds stable knowledge (architecture, conventions, decisions, domain); each task starts fresh (request + relevant files + plan + diff). History is not memory.

**Why**: Maximizes cache reuse, keeps task contexts small, forces explicit knowledge transfer.

## D8 — Herdr-only runtime

**Decision**: Subagents require `herdr` (`HERDR_ENV=1`, `HERDR_SOCKET_PATH`); panes managed via `extensions/herdr-subagents/terminal.ts`.

**Why**: Pane lifecycle, activity sidecars, and status widget depend on herdr multiplexing.
