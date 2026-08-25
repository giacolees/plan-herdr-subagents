# Benchmark Suite

Live A/B benchmarks for the V2 workflow and the V3 cached-context workflow.

## Principles

- Use the same authenticated model, thinking level, tool allowlist, and task text for both versions.
- Run each version in a clean `pi` session and detached worktree.
- Preserve session JSONL until metrics and quality results are extracted.
- Measure cost and latency alongside answer quality; neither metric alone establishes a better workflow.
- Treat results as task-specific until repeated across task classes and multiple runs.

## Layout

- `tasks/` — version-neutral task fixtures and quality rubrics.
- `scripts/aggregate_usage.py` — aggregates assistant `usage` records and tool results from Pi session JSONL files.
- `results/` — measured benchmark reports.

## Existing benchmarks

| Benchmark | Task class | Model | Result |
| --- | --- | --- | --- |
| [Context cache retrieval](results/2026-08-25-v2-v3-context-cache-benchmark.md) | Single-agent repository orientation | `opencode-go/muse-spark-1.2-contributor` | V3: -8.4% reported cost, -52.3% elapsed time; equal 13/14 output-quality score |
| [Cross-cutting workflow-status plan](results/2026-08-25-v2-v3-multi-agent-workflow-status.md) | Four-agent planning pipeline | `opencode-go/muse-spark-1.2-contributor` | V3: -31.0% reported cost, -22.1% total tokens; 16/18 vs V2's normalized 13/18 quality score |

## Running a benchmark

1. Create a detached worktree for the V2 baseline and one for the candidate.
2. Run the relevant task fixture in separate sessions with the same `pi` arguments.
3. Use `scripts/aggregate_usage.py` to aggregate each version's JSONL files.
4. Blind-score final outputs against the fixture rubric.
5. Write a dated result under `results/`, including task text, model/runtime, raw aggregates, quality outcome, and limitations.

The suite intentionally avoids committing raw session transcripts because they may include repository-specific content. Keep them temporarily while evaluating a run, then delete them after the report preserves the aggregates.
