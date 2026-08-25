# V2 vs V3 Cached-Context Benchmark

**Date:** 2026-08-25

**Status:** one live retrieval benchmark; not a full workflow benchmark

## Question

Does V3's durable `.agent/` knowledge cache save enough rediscovery work to offset the additional context it asks agents to read?

## Setup

| Item | Value |
| --- | --- |
| Baseline | `97a5e97` (V2 parent commit) |
| Treatment | `4dee836` (V3 cached-context workflow) |
| Model | `opencode-go/muse-spark-1.2-contributor` |
| Thinking | `low` |
| Session mode | Separate clean `pi --print --mode json` sessions |
| Tools | `read,bash` only |
| Disabled | Extensions, skills, context-file discovery |

Both runs received the identical prompt. It required a ≤180-word, repository-grounded explanation of:

1. the `/plan` entry point and workflow loader;
2. planner-to-parent todo forwarding;
3. plan-artifact and stable-knowledge locations; and
4. worker and reviewer responsibilities.

The prompt instructed the agent to read `.agent/architecture.md`, `conventions.md`, `decisions.md`, and `domain.md` when present, then inspect only files needed for unanswered questions. V2 had no `.agent/` cache; V3 did.

## Results

Both runs produced correct answers, stayed below 180 words, and ended with `DONE`.

| Metric | V2 | V3 | V3 change |
| --- | ---: | ---: | ---: |
| Total tokens | 125,889 | 64,891 | **-48.5%** |
| Billed input tokens | 29,725 | 27,136 | **-8.7%** |
| Cache-read tokens | 94,103 | 35,317 | **-62.5%** |
| Output tokens | 2,061 | 2,438 | +18.3% |
| Agent turns | 8 | 6 | **-25.0%** |
| Tool results | 17 | 13 | **-23.5%** |
| Elapsed time | 41.2 s | 19.7 s | **-52.3%** |
| Reported cost | $0.003573 | $0.003272 | **-8.4%** |

## Output quality evaluation

A fresh V2 and V3 answer was generated with the same retrieval prompt and then
scored by a separate Muse run at `thinking=minimal`. Candidate identities were
randomized for the judge. Each candidate had branch-specific expected facts,
but the judge did not receive its V2/V3 label.

The 14-point rubric scored correctness (0–4), coverage of all four requested
subjects (0–4), repository evidence (0–2), concision (0–2), and instruction
following (0–2).

| Metric | V2 | V3 |
| --- | ---: | ---: |
| Answer length | 117 words | 125 words |
| Correctness | 3 / 4 | 3 / 4 |
| Coverage | 4 / 4 | 4 / 4 |
| Evidence | 2 / 2 | 2 / 2 |
| Concision | 2 / 2 | 2 / 2 |
| Instruction following | 2 / 2 | 2 / 2 |
| Total | **13 / 14** | **13 / 14** |
| Verdict | Pass | Pass |

The cache did not change the measured answer quality for this narrow task:
both answers were correct, complete, concise, cited repository sources, and
ended with `DONE`. The judge deducted one correctness point from each for
unnecessary details that were not in the supplied acceptance facts. V3 added
more cache-related detail; that was informative but did not improve its score.

## Interpretation

For this repository-orientation task, V3's cache avoided enough repeated exploration to reduce both cost and latency. The result supports the design hypothesis: durable project summaries can be cheaper than rediscovering the same architecture and conventions in every independent agent session.

This is not evidence that every task is cheaper. Self-evident small tasks may pay more for cache retrieval than they save; unfamiliar, repeated, and multi-worker tasks are more likely to benefit.

## Limitations

- One task and one run per version; model output is nondeterministic.
- The quality judge used the same model family as the candidate runs; use a second judge model and multiple blind samples before making a strong quality claim.
- This exercises retrieval/planning, not the full interactive `/plan → worker × N → reviewer` pipeline.
- The baseline and treatment differ in behavior as well as cache availability (for example, plan artifact paths).
- Temporary session logs were deleted after metrics extraction; this report preserves the measured aggregates and configuration, not raw transcripts.

## Reproduction protocol

Use the same model, thinking level, prompt, tool allowlist, and clean session boundaries for both commits. Run V2 from a detached parent worktree and V3 from the candidate worktree. Save each session as JSONL, then aggregate `message.usage` for assistant messages:

```bash
pi --print --mode json --no-extensions --no-skills --no-context-files \
  --tools read,bash \
  --model opencode-go/muse-spark-1.2-contributor \
  --thinking low \
  --session /tmp/<version>.jsonl \
  "<identical benchmark prompt>"
```

Report input, output, `cacheRead`, reasoning, total tokens, `usage.cost.total`, assistant-turn count, tool-result count, elapsed session time, and an answer-quality rubric. Extend this to at least three runs each for:

1. a familiar small change;
2. an unfamiliar medium change; and
3. a multi-worker change.
