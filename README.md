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
pnpm review eval/cases/broken-ref.md
```

Use an Anthropic API key through `ANTHROPIC_API_KEY`, or authenticate using a supported Claude login.

To save the structured report:

```bash
pnpm review eval/cases/broken-ref.md --out report.json
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

The `eval/cases` directory contains eight example requirements documents with expected findings, including both intentionally flawed and clean examples. The evaluation runner compares generated findings against the expected `(type, requirement_id)` pairs and reports true positives, false positives, false negatives, precision, and recall.

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
  cases/                      Example documents and expected findings
  run.ts                      Precision/recall evaluation runner
```

## Technology

TypeScript · Claude Agent SDK · Model Context Protocol (MCP) · Zod · Node.js · pnpm

## License

MIT — see [LICENSE](LICENSE).
