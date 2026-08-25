# Cross-Cutting Workflow Status Plan

## Product request

Plan, but do not implement, a non-mutating `/workflow-status` command for this package. It must let a user understand the workflow without inspecting session files manually.

The command should report:

1. cached-context health: which `.agent/` files exist, whether plan artifacts exist, and a count of plans;
2. active subagents: name, role, lifecycle state, elapsed time, effective model, and thinking level when known;
3. planning state: whether planner todos have reached the parent session and the visible todo count; and
4. actionable but safe guidance when data is unavailable, malformed, or the command runs outside a planner workflow.

The command must not mutate cache files, plans, todos, or session data. Preserve current model-routing, herdr-only, and todo-forwarding behavior.

## Specialist prompts

Run each specialist in a separate clean session. Every specialist first reads `.agent/*.md` when available, then reads only source needed for its assigned question.

### Runtime specialist

```text
Map the command registration, active-subagent state, lifecycle/status projections, model-routing data, and cache bootstrap behavior needed to plan `/workflow-status`. Do not modify files. Return a concise source-grounded report with exact files/symbols, available data, missing data, edge cases, and test recommendations. End with DONE.
```

### Todo specialist

```text
Map planner todo creation, child-session persistence, parent-session import, failure fallbacks, and the available parent todo state needed to plan `/workflow-status`. Do not modify files. Return a concise source-grounded report with exact files/symbols, available data, missing data, edge cases, and test recommendations. End with DONE.
```

### Workflow specialist

```text
Map the planner, worker, reviewer, scout, plan-artifact, cached-context, product-domain, and documentation contracts affected by `/workflow-status`. Do not modify files. Return a concise source-grounded report with exact files/symbols, scope boundaries, edge cases, and test recommendations. End with DONE.
```

### Integrator

Give the integrator the three specialist reports verbatim, then use this prompt:

```text
You are the lead planner. Using the three specialist reports and the repository only when a report leaves a factual gap, produce an implementation plan for `/workflow-status`. Do not modify files.

In at most 900 words include: goal, explicit scope in/out, affected components, data contract and unavailable-data behavior, implementation steps in dependency order, atomic binary Ideal State Criteria, exact acceptance commands/tests, risks, and a concise list of open questions. Preserve existing conventions and avoid redesign. End with DONE.
```

## Final-plan quality rubric

| Dimension | Points | Requirement |
| --- | ---: | --- |
| Correctness | 0–4 | Uses only data actually exposed by runtime, todo, and workflow code. |
| Coverage | 0–4 | Covers all four status categories and unavailable-data behavior. |
| Architecture | 0–3 | Preserves model routing, herdr-only semantics, and todo forwarding. |
| Testability | 0–3 | ISC items are binary and acceptance tests/commands are specific. |
| Scope discipline | 0–2 | Command is non-mutating; no unrelated redesign. |
| Instruction following | 0–2 | Read-only, ≤900 words, and ends with `DONE`. |
