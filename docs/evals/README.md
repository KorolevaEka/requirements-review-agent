# Codex alternative: evaluation evidence

`main` demonstrates Claude Agent SDK orchestration, three subagents and a custom MCP requirements tool. `codex-cli-variant` demonstrates an alternative CLI integration: one model call with three review perspectives and a precomputed index. Do not present the latter as a multi-agent or MCP implementation.

`codex-baseline.json` preserves the original Codex run: 11 TP, 5 extra findings, 0 FN on eight small cases, precision 68.75%, recall 100%. The model was not recorded; one case came from cache. These are historical results, not Claude results or a reproducible performance claim.

The development expectations were manually revised after reading the findings:

- `vague-performance`: add untestable speed criteria and the comma-only versus selectable-delimiter contradiction.
- `contradiction-session`: add missing local acceptance criteria for the unavailable Login spec. This evaluation treats unavailable external acceptance criteria as missing; a different product scope could exempt reference-only requirements.
- Keep scan-service failure handling and the meaning of “oldest session” as unmatched findings for now. Their acceptance requires an explicit scope decision, not automatic adoption of every model suggestion.

No new AI results are claimed for these revised expectations. Rerun before publishing new metrics. Review `detail` manually; there is no LLM judge. Reference findings measure use of the supplied deterministic index, not unaided reference discovery.

## Reproduce and compare

Replace `MODEL` with an available explicit model ID. Repeated runs always bypass cache.

```bash
pnpm eval --model MODEL --no-cache
pnpm eval --model MODEL --repeat 3
pnpm eval --model MODEL --suite holdout --repeat 3
pnpm eval --model MODEL --case mixed-export --no-cache
```

Reports record provider, requested model, CLI version, suite hash, repetition, full findings, latency and cache status. Compare per-run precision/recall as well as totals. Monetary cost is not reported by this runner. CLI configuration and service-side model updates can still affect reproducibility.

`cases` is the development suite. `holdout` contains two new longer documents (20 requirements each): a clean document and one undefined reference. They have not been used for prompt tuning or measured yet. Keep additional independent cases here; once used to tune prompts, move them to development and create fresh holdout cases.

## Present both implementations

Use the GitHub branch selector or compare `main...codex-cli-variant`. Present architecture and evaluation evidence separately. There is no measured Claude-versus-Codex comparison until the original SDK version has actually run with Anthropic access.
