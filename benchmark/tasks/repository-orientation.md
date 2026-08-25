# Repository Orientation

## Task

```text
You are preparing a change plan for this repository. Do not modify files.

First read `.agent/architecture.md`, `.agent/conventions.md`, `.agent/decisions.md`, and `.agent/domain.md` if they exist. Then inspect only the repository files needed to answer any remaining questions.

In at most 180 words, state:
1. which component exposes `/plan` and where it loads the planning workflow;
2. how planner-created todos reach the parent session;
3. the plan-artifact location and the stable-knowledge location; and
4. the worker and reviewer responsibilities.

Use only repository facts. Give file references when you inspect source. End with `DONE`.
```

## Quality rubric

| Dimension | Points | Requirement |
| --- | ---: | --- |
| Correctness | 0–4 | Statements match the tested branch. |
| Coverage | 0–4 | Answers all four requested subjects. |
| Evidence | 0–2 | Uses relevant repository file references. |
| Concision | 0–2 | At most 180 words without needless detail. |
| Instruction following | 0–2 | Read-only and ends with `DONE`. |
