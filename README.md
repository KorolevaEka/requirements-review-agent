# Requirements Review Agent

A TypeScript-based multi-agent application for reviewing software requirements using the Claude Agent SDK.

It analyzes Markdown requirements documents and produces structured findings for ambiguity, missing information, untestable acceptance criteria, conflicting requirements, and broken references.

## How it works

The application combines deterministic document analysis with specialized AI reviews:

- **Requirements index:** a custom in-process MCP tool extracts requirement IDs, references, and acceptance-criteria markers, and identifies structural issues.
- **Completeness reviewer:** checks for missing information and ambiguous requirements.
- **Testability reviewer:** checks whether expected behavior is expressed as verifiable acceptance criteria.
- **Consistency reviewer:** looks for contradictions and invalid cross-references.
- **Review coordinator:** delegates to the specialized agents and validates a structured JSON report.

The agents use read-only tools. Reviews support configurable cost limits, retry handling, local result caching, and optional verbose logging.

## Architecture

```text
Markdown requirements
        │
        ▼
CLI (src/index.ts)
        │
        ▼
Review coordinator (src/review.ts)
        ├── Completeness agent
        ├── Testability agent
        ├── Consistency agent
        ├── Custom MCP requirements index
        └── Structured output validation (Zod)
        │
        ▼
Findings + run metadata
```

## Getting started

Prerequisites: Node.js 20+, pnpm, and access to Claude through the Claude Agent SDK.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm review eval/dev/broken-ref.md
```

Use an Anthropic API key through `ANTHROPIC_API_KEY`, or authenticate using a supported Claude login.

To save the structured report:

```bash
pnpm review eval/dev/broken-ref.md --out report.json
```

Useful options include `--model`, `--budget`, `--no-cache`, and `-v` for verbose execution logs.

## Example finding

```text
[high] contradiction REQ-003 — Row limit conflicts with REQ-001
    Two requirements define different maximum row counts.
    → Align the limits and reference the shared rule.
```

Each finding includes a type, severity, requirement reference, explanation, suggested resolution, and the reviewing agent.

## Evaluation

The `eval/dev` directory contains eight example requirements documents with expected findings, including both intentionally flawed and clean examples. The evaluation runner compares generated findings against the expected `(type, requirement_id)` pairs; contradictions require the complete unordered set of participating IDs and reports true positives, false positives, false negatives, precision, and recall.

```bash
pnpm eval
pnpm eval --case broken-ref
pnpm eval --no-cache
```

Reports are saved under `eval/results/`. Evaluation metrics depend on the model and run configuration; no fixed performance results are claimed here.

## Project structure

```text
src/
  index.ts                    CLI entry point
  review.ts                   SDK execution, result validation, caching
  agents.ts                   Specialized agent definitions
  schema.ts                   Structured finding schema
  mcp/requirements.ts         Custom MCP requirements index
  mcp/requirements.test.ts    Parser tests
eval/
  dev/                        Development documents and expected findings
  holdout/                    Fresh evaluation fixtures; never tune on these
  run.ts                      Precision/recall evaluation runner
```

## Technology

TypeScript · Claude Agent SDK · Model Context Protocol (MCP) · Zod · Node.js · pnpm

## License

MIT — see [LICENSE](LICENSE).

## Offline checks and runtime controls

`pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` require no API credentials. GitHub Actions runs the first three on pushes and pull requests. The current lint command enables TypeScript unused-symbol and fallthrough checks; installing ESLint/Biome remains pending because the npm registry was unreachable during this change.

```bash
pnpm review examples/upload.md --timeout 120000 --markdown report.md --no-cache
pnpm eval --split dev --repeats 3 --no-cache
pnpm eval --split dev --repeats 3 --agent-model haiku --no-cache
pnpm eval --split holdout --repeats 3 --no-cache
```

The timeout is milliseconds per document, including retries. Ctrl+C aborts the SDK query and retry waits. Budget and turn-limit errors, authentication errors, and invalid structured output are not retried. `--no-cache` disables both cache reads and writes. Cache keys include document content, model settings, budget, turn limit, and an explicit implementation version (bump it when prompts/tools change).

Every uncached attempt writes timestamped SDK messages to `runs/*.trace.jsonl`, including tool-use and tool-result messages exposed by the SDK, session/task metadata and final turns/cost. Failed runs keep their trace. This records the SDK-visible stream rather than claiming access to hidden subagent reasoning. Traces contain document excerpts and tool outputs; `runs/` is gitignored. Markdown output quotes requirement headings with their source line numbers; finding details contain the reviewer’s evidence.

The second MCP tool, `numeric_constraints`, deterministically extracts literal numbers with units, source lines and requirement IDs. It does not infer conflicts or normalize units; the consistency reviewer compares their meaning and scope.

## Evaluation protocol and annotation policy

All eight existing fixtures are **dev** because they have already informed prompts and expectations. `eval/holdout/` contains two fresh synthetic fixtures (clean token revocation and conflicting retention), added after the current prompts were fixed. This is a small smoke-test holdout, not an independently audited benchmark. Expand and independently review it before a final assessment; freeze it and avoid prompt tuning against its results. An unknown case or empty split fails before invoking the API.

- `ambiguity`: text supports materially different interpretations or uses vague wording.
- `incomplete`: missing required information, explicit TBD/TODO, or an undefined necessary path.
- `missing_acceptance_criteria`: absent criteria or criteria without a verifiable pass/fail condition. An “Acceptance criteria” heading alone is insufficient. Observable outcomes do not always require a numeric threshold.
- `contradiction`: incompatible requirements, annotated with **both** IDs. Scope must agree; merely different numbers are insufficient.
- `broken_reference`: an unresolved reference or duplicate definition.

Independent defects may coexist: “download starts quickly” is both ambiguous and unverifiable. “See Login spec” without supplied criteria is not a testable criterion. Development expectations reflect these rules. Other supplied payment criteria can be observed even when the fee percentage remains TBD, so that fixture keeps its `incomplete` annotation alone.

Repeated evaluations automatically bypass the cache and print min/max/mean precision and recall. Each sample stores its split, models, iteration, costs and case results in `eval/results/`. Keep coordinator model, SDK version and other settings fixed when comparing subagent models. The current $2 budget is **per query attempt**, not a cap across retries or the full evaluation.

| Subagent model | Runs | Precision range | Recall range | Cost |
| --- | --- | --- | --- | --- |
| sonnet | Pending credentials | — | — | — |
| haiku | Pending credentials | — | — | — |

No live repeatability or model-quality claims have been measured. The commands above prepare those measurements; populate this table from saved evaluation samples when credentials are available.
