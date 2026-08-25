# Architecture

Single `pi` package for the `/plan` grill-and-plan workflow on `herdr` subagents.

## Package composition

- **Runtime**: vendored `extensions/herdr-subagents/` (fork of `pi-herdr-subagents@0.1.7`) — provides `subagent`/`subagent_resume`/`subagent_interrupt` tools, `/plan` `/iterate` slash commands, herdr pane lifecycle, model routing, status widget.
- **Todo**: `@juicesharp/rpiv-todo` via `node_modules/` — `todo` tool, live overlay, `blockedBy` graph.
- **Diagnostics**: `pi-lens` via `node_modules/` — `lsp_diagnostics`, `lens_diagnostics`, `symbol_search`, `module_report`, `ast_grep_search`.
- **Todo forwarding**: `extensions/planner-todo-forward.ts` — sidecar + live-store import so planner todos land in parent session.
- **Skills**: `skills/grilling`, `skills/domain-modeling` (vendored).

`package.json` declares `bundledDependencies` + `pi.extensions`/`pi.skills` per `packages.md` — one `pi install` pulls the whole graph.

## Agent topology

```
User Request
  → Planner (interactive, grilling + domain-modeling → plan.md + pointer todos)
  → [Scout] (optional, read-only reconnaissance — only for unfamiliar/large areas)
  → Worker × N (sequential, pointer-contract, one todo each)
  → Reviewer (ISC evidence + P0-P3 triage)
  → Knowledge update (decisions.md / conventions.md / domain.md)
```

Models fixed via `config.json` (`models.default` → `models.agents.<role>`). Spawn omits `model`/`thinking` — extension resolves. Overrides: tool-arg → agent frontmatter → per-agent config → global default → parent model.

## Artifacts

- `.agent/plans/YYYY-MM-DD-<name>/plan.md` — pointer-based plan (ISC + Acceptance).
- `CONTEXT.md` (+ `docs/adr/NNNN-*.md`) — product domain glossary/ADRs (lazy, via domain-modeling skill).
- `.agent/` — **cached project knowledge** (this directory). Stable, reusable across tasks; first `/plan` initializes missing files from `templates/agent/` without overwriting target-project knowledge.
- Todos — pointer contract bodies (`plan §`, `pattern: file:range`, `constraints`, `acceptance: cmd (ISC-n)`).

## Key constraints

- `herdr` only (`HERDR_ENV=1`). Subagents run in herdr panes; artifact dirs under `<sessionDir>/artifacts/<sessionId>/`.
- `spawning: false` on worker/scout/reviewer — only planner may spawn scouts.
- Workers sequential (commit conflicts); planner `interactive: true` so stall pings suppressed.

## References

- `extensions/herdr-subagents/index.ts` — launch/observe/lifecycle/widget.
- `extensions/herdr-subagents/plan-skill.md` — V3 workflow (cached + fresh layers).
- `agents/planner.md`, `agents/worker.md`, `agents/reviewer.md`, `agents/scout.md`.
