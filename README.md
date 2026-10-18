# Requirements Review Agent

A TypeScript application for reviewing Markdown software requirements through Codex CLI.
It checks ambiguity, incomplete requirements, missing acceptance criteria, contradictions and broken references.

## Setup

Requires Node.js 20+, pnpm, and an installed Codex CLI authenticated with an account that has Codex access:

```bash
codex login
pnpm install
pnpm review eval/cases/broken-ref.md
```

Claude and an Anthropic subscription or API key are no longer required. The model still runs through Codex; this is not an offline model. Usage follows the limits and billing of your Codex authentication.

## Review

```bash
pnpm review requirements.md --out report.json
pnpm review requirements.md --model MODEL --no-cache -v
```

The default model comes from your Codex configuration. The runner builds a deterministic requirements index, then sends the document and index to `codex exec` with a JSON output schema and a read-only sandbox. A single Codex call applies three review perspectives (completeness, testability, consistency); these are not separate subagents or an MCP server. The resulting report is validated with Zod.

Reviews time out after five minutes. Cache entries include the document, explicit model, CLI version, prompts and schema. Reviews without an explicit model bypass cache. CLI monetary cost is unavailable and is recorded as `null`; no dollar budget is enforced. Reports are saved under `runs/`.

## Evaluation

```bash
pnpm eval --model MODEL
pnpm eval --model MODEL --case broken-ref
pnpm eval --model MODEL --repeat 3
```

Eight fixtures include flawed and clean requirements. The runner compares findings against expected `(type, requirement_id)` pairs and reports precision, recall, false positives and false negatives. Reports are saved under `eval/results/`. Evaluation requires the same Codex access as review.

## Local checks

```bash
pnpm test
pnpm typecheck
pnpm build
```

These checks do not call an AI service. The deterministic parser lives in `src/mcp/requirements.ts` (the path is retained for compatibility).

[Codex non-interactive execution documentation](https://learn.chatgpt.com/docs/non-interactive-mode)

## License

MIT — see [LICENSE](LICENSE).

This branch is an alternative implementation. The original Claude Agent SDK / subagents / MCP architecture remains on `main`. See [evaluation evidence and comparison instructions](docs/evals/README.md).
