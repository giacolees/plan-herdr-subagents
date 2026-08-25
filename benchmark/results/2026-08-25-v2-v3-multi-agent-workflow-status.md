# V2 vs V3 Multi-Agent Workflow-Status Benchmark

**Date:** 2026-08-25

**Status:** one live four-agent planning benchmark; direct Pi sessions, not a herdr orchestration test

## Question

Does V3's durable `.agent/` cache improve a longer cross-cutting planning task with multiple independent specialists and a final integrator?

## Task

The task fixture is [`../tasks/cross-cutting-workflow-status.md`](../tasks/cross-cutting-workflow-status.md). It asks for a read-only implementation plan for `/workflow-status`, covering cached-context and plans, active subagents, planner todo forwarding, and safe unavailable-data behavior.

Each version ran this sequence in separate clean sessions:

1. runtime specialist;
2. todo-forwarding specialist;
3. workflow-contract specialist; and
4. integrator, with the three reports supplied verbatim.

Every specialist attempted to read `.agent/*.md` first when present, then used only `read,bash` to fill factual gaps. The integrator had the same cache instruction, the same product request, and the same report structure in both versions.

## Setup

| Item | Value |
| --- | --- |
| Baseline | `97a5e97` (V2 parent commit) |
| Treatment | `4dee836` (V3 cached-context workflow) |
| Model | `opencode-go/muse-spark-1.2-contributor` |
| Thinking | `low` |
| Sessions | Four clean `pi --print --mode json` sessions per version |
| Tools | `read,bash` only |
| Disabled | Extensions, skills, context-file discovery |

## Live usage results

| Metric | V2 | V3 | V3 change |
| --- | ---: | ---: | ---: |
| Total tokens | 550,804 | 429,017 | **-22.1%** |
| Billed input tokens | 171,201 | 111,802 | **-34.7%** |
| Cache-read tokens | 368,186 | 306,659 | **-16.7%** |
| Output tokens | 11,417 | 10,556 | **-7.5%** |
| Assistant turns | 30 | 23 | **-23.3%** |
| Tool results | 57 | 50 | **-12.3%** |
| Reported cost | $0.020140 | $0.013905 | **-31.0%** |
| End-to-end wall time | 77.3 s | 87.4 s | +13.1% |

V3 reduced model work and reported spend, but this single run took longer wall-clock time. The slower wall time is likely model-service variance; do not infer a latency regression from one sample.

## Output quality

The integrator plans were 758 words (V2) and 751 words (V3); both met the ≤900-word constraint and ended with `DONE`.

A repository-grounded Muse review scored the final plans on correctness (4), coverage (4), architecture (3), testability (3), scope discipline (2), and instruction following (2).

| Metric | V2 | V3 |
| --- | ---: | ---: |
| Correctness | 2 / 4 | 3 / 4 |
| Coverage | 3 / 4 | 4 / 4 |
| Architecture | 3 / 3 | 3 / 3 |
| Testability | 1 / 3 | 2 / 3 |
| Scope discipline | 2 / 2 | 2 / 2 |
| Instruction following | 2 / 2 | 2 / 2 |
| Normalized total | **13 / 18** | **16 / 18** |

The judge initially emitted `12 / 18` for V2 because it incorrectly treated 758 words as exceeding 900. The normalized total corrects only that mechanical error; all other judge findings remain.

### Quality findings

- **V2:** covered the core design and preserved read-only behavior, but cited inaccurate line locations and proposed nonexistent test commands (`pnpm test`, `node --test` against a TypeScript extension, and a missing recipe script). It also assumed internal runtime/todo APIs without first proposing a stable extraction boundary.
- **V3:** covered every requested status category, correctly identified that `/workflow-status` must not call the mutating cache bootstrap, and gave a stronger unavailable-data contract. Minor line-number drift and a nonexistent `pnpm test` command reduced its score.

## Interpretation

This longer multi-agent task supports the cost hypothesis more strongly than the orientation run: V3 used 31.0% less reported spend and 22.1% fewer total tokens while producing the higher-quality final plan.

The cache does not automatically guarantee better answers. It helps when agents share stable, accurate project knowledge and still validate task-specific claims against source. Incorrect or stale cache entries would amplify mistakes across every specialist.

## Limitations

- One run per version; model latency and output are nondeterministic.
- Specialists and integrator were invoked directly, so this measures the context strategy rather than terminal-pane behavior or real todo mutations.
- Both versions differ in artifact location and workflow behavior, not only cache availability.
- The quality reviewer used the same model family as the candidate agents. Use a second judge model and repeated blind samples for a release-quality conclusion.
- Raw sessions/reports were temporary and deleted after extracting aggregates; this report preserves the task, configuration, measured metrics, and quality findings.

## Reproduction

Use the task fixture, run four clean model sessions per version, save the session JSONL files, and aggregate only the four session files (not `--mode json` stdout logs):

```bash
python3 benchmark/scripts/aggregate_usage.py \
  /tmp/<version>-runtime.jsonl \
  /tmp/<version>-todos.jsonl \
  /tmp/<version>-workflow.jsonl \
  /tmp/<version>-integrator.jsonl
```

Keep final plans for a repository-grounded quality review, then delete the temporary worktrees and session logs.
