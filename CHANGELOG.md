# Changelog

All notable changes to `plan-herdr-subagents` are documented here.
Format follows Keep a Changelog.

## [0.2.0] - 2026-08-25

### Added

- Single-package bundle for the entire `/plan` V2 grill-and-plan workflow.
- Vendored `herdr-subagents` extension (`extensions/herdr-subagents/`) forked from `pi-herdr-subagents@0.1.6` with V2 agent overrides (planner exit-gate, neutral grilling, worker pointer-contract).
- Vendored agents `planner`/`worker`/`scout`/`reviewer`/`visual-tester` (`agents/`) — V2 snapshots from `~/.pi/agent/agents/` (2026-08-25).
- Vendored skills `grilling` and `domain-modeling` (`skills/`) from `~/.agents/skills/` (snapshot 2026-08-25).
- `extensions/planner-todo-forward.ts` — cross-session todo forwarding (previously global `~/.pi/agent/extensions/`).

### Dependencies (acknowledged baselines)

- `pi-herdr-subagents@^0.1.6` — bundled
- `@juicesharp/rpiv-todo@^2.4.0` — bundled
- `pi-lens@^3.8.71` — bundled

Peer dependencies remain external: `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`.

### Changed

- `pi.extensions` now points to local vendored `herdr-subagents` + `planner-todo-forward`, and to `node_modules/` for `rpiv-todo` / `pi-lens` per `packages.md` guidance.
- `pi.skills` points to vendored local skills.

## [0.1.0] - prior

- Empty scaffold.
