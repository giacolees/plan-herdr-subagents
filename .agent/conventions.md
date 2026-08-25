# Conventions

## General

- Minimal, focused changes — look like they belong. No redesign beyond scope.
- Read before editing. Ground every external API via `resolve-library-id` + `query-docs`; in-repo APIs via `symbol_search`/`module_report`/`read_symbol`.
- Prefer `ast_grep_search` (via `pi_lens_activate_tools`) over fragile text grep for structural edits.
- Keep `.agent/` stable — only permanent knowledge. No debugging sessions, temp ideas, or task reasoning.

## TypeScript / Extensions

- `type: module`, ESM imports with `.ts` suffix where required by `pi`.
- Validate config strictly (`parseModelConfig` pattern) — reject unsupported keys with clear errors.
- Vendored sources preserve upstream headers; bump `dependencies` + re-vendor on baseline updates; note in `CHANGELOG.md`.

## Planning

- Plan is pointer-based: terms → `CONTEXT.md`, decisions → `docs/adr/`, no duplication. ISC items atomic, binary, with exact acceptance commands.
- Todo bodies ≤5 lines: `Implement plan.md §X (files: ...) / Pattern: file:range / Constraints: ... / Acceptance: cmd (ISC-n)`.
- Effort 2-5 min per todo; one independent task each.

## Workers

- Claim todo before implementing (`todo` tool).
- Run acceptance commands + `lsp_diagnostics` + `lens_diagnostics mode=all` before closing — zero new errors/warnings.
- Never edit `plan.md`/`CONTEXT.md`/ADRs; flag drift via `caller_ping` or summary.
- Commit via commit skill; close todo on pass.

## Reviewer

- Check each ISC with evidence (command output or `file:line`). Never infer pass from vibes.
- Cross-check terms against `CONTEXT.md`, decisions against ADRs. Triage P0-P3.

## Files

- Plans: `.agent/plans/YYYY-MM-DD-<name>/plan.md` (+ optional `scout-context.md`).
- Domain: `CONTEXT.md` glossary-only (1-2 sentence definitions, `_Avoid:` aliases), `CONTEXT-MAP.md` if multi-context.
- Decisions: `docs/adr/NNNN-slug.md` — one paragraph is enough; only when hard-to-reverse + surprising + traded-off.
