# Requirements Review Agent

A multi-agent reviewer for software requirements, built on the
[Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) in TypeScript.

Give it a markdown requirements document and it returns a structured list of defects:
vague wording, TBD placeholders, requirements without acceptance criteria, contradictions
between requirements, and references to requirements that do not exist.

Output shape (one line per finding, then run stats):

```
[high] contradiction REQ-003 — Row limit conflicts with REQ-001
    REQ-001 says "Maximum 5,000 rows per file", REQ-003 says "at most 10,000 rows".
    → Pick one limit and reference it from the other requirement.  (consistency-reviewer)

N findings · T turns · $cost · Ns · subagents: completeness-reviewer, consistency-reviewer, testability-reviewer
```

## Why this exists

Reviewing requirements is a judgement task, but parts of it are mechanical: counting ids,
following cross-references, checking that every requirement has an acceptance-criteria block.
Models are unreliable at exactly those parts. This project splits the work accordingly:

- **An MCP tool** (`requirements_index`) does the deterministic part: parses `REQ-NNN` headings,
  collects outgoing references, flags broken references, duplicates and missing acceptance criteria.
- **Three specialised subagents** do the judgement, each owning a distinct slice of the finding
  taxonomy so they do not step on each other and so the eval can attribute misses.
- **An orchestrator** only delegates and merges. Its output is constrained to a JSON schema.
- **An eval harness** replays eight documents with planted defects and reports precision and recall.

## Architecture

```
pnpm review <file.md>
  └─ src/index.ts              CLI (node:util parseArgs)
      └─ src/review.ts         orchestration: cache → query() → validate → persist
          ├─ src/agents.ts     3 AgentDefinitions (sonnet, read-only tools)
          │    completeness-reviewer  → incomplete, ambiguity
          │    testability-reviewer   → missing_acceptance_criteria
          │    consistency-reviewer   → contradiction, broken_reference
          ├─ src/mcp/requirements.ts  in-process MCP server with requirements_index
          └─ src/schema.ts     zod schema → JSON schema for structured output
eval/run.ts                     precision / recall over eval/cases/*.md
```

**Tool calling.** The orchestrator is allowed `Read`, `Agent` and the custom MCP tool only.
Subagents get `Read` plus the MCP tool where it helps them; none can write or run commands.

**State.** Each run is keyed by a content hash of the input. A finished review is written to
`.cache/<hash>.json` and replayed on the next call for the same content, so eval reruns after a
prompt change only pay for documents whose expectations or text changed when you pass `--no-cache`.
Every run is also appended to `runs/` with cost, turns, duration and which subagents were invoked.

**Error handling.** The query loop is wrapped in exponential-backoff retry (3 attempts). Result
subtypes that retrying cannot fix (`error_max_turns`, `error_max_budget_usd`) and authentication
errors are surfaced immediately. The final JSON is validated with zod before anything is persisted,
so a malformed model answer fails loudly rather than producing a half-empty report. A per-run budget
(`--budget`, default $2) and `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` bound cost and fan-out.

## Running it

Requires Node 20+ and pnpm. Authenticate once with either an API key or a Claude login:

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # or: claude login
pnpm install
pnpm test                              # parser unit test, no API calls
pnpm review eval/cases/broken-ref.md -v
pnpm eval                              # all cases; add --case <name> for one
```

`-v` logs every tool call and subagent dispatch to stderr. `--out report.json` writes the raw report.

## Eval

`eval/cases/` holds eight short requirement documents. Six have planted defects; two are clean
and exist to catch false positives. Each `*.expected.json` lists the expected findings as
`(type, requirement_id)` pairs. A finding matches if the type is equal and the id is either the
primary `requirement_id` or in `related_ids` (so a contradiction may be reported from either side).

The runner prints `tp / fp / fn` per case, the misses and extras by `(type, id)`, and aggregate
precision and recall. Current numbers will be added here after the first full run.

Results are written to `eval/results/<timestamp>.json`, so prompt changes can be compared run to run.

## Finding taxonomy

| type | owner | example |
|---|---|---|
| `ambiguity` | completeness-reviewer | "export should be fast" |
| `incomplete` | completeness-reviewer | "fee percentage is TBD" |
| `missing_acceptance_criteria` | testability-reviewer | requirement with no verifiable criteria |
| `contradiction` | consistency-reviewer | 15-minute idle timeout vs 24-hour session |
| `broken_reference` | consistency-reviewer | "as defined in REQ-012" where REQ-012 does not exist |

## Document format

Any markdown where each requirement is a heading of the form `### REQ-001: Title`. Body text
until the next `REQ-` heading belongs to that requirement. An "Acceptance criteria" line or a
Given/When/Then block marks the requirement as having criteria. See `eval/cases/` for examples.
