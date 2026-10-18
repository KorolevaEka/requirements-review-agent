import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { review } from "./review.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", short: "o" },
    model: { type: "string" },
    budget: { type: "string", default: "2" },
    "no-cache": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

const file = positionals[0];
if (!file) {
  console.error("usage: pnpm review <requirements.md> [--out report.json] [--model opus|sonnet] [--budget 2] [--no-cache] [-v]");
  process.exit(2);
}

try {
  const run = await review({
    file,
    model: values.model,
    maxBudgetUsd: Number(values.budget),
    cache: !values["no-cache"],
    verbose: values.verbose,
  });

  if (values.out) await writeFile(values.out, JSON.stringify(run.report, null, 2));

  console.log(`\n${run.report.summary}\n`);
  for (const f of run.report.findings) {
    console.log(`[${f.severity}] ${f.type} ${f.requirement_id ?? "(document)"} — ${f.title}`);
    console.log(`    ${f.detail}`);
    console.log(`    → ${f.suggestion}  (${f.agent})\n`);
  }
  console.log(
    run.cached
      ? "(served from cache)"
      : `${run.report.findings.length} findings · ${run.turns} turns · $${run.cost_usd.toFixed(3)} · ${(run.duration_ms / 1000).toFixed(0)}s · subagents: ${run.subagents_invoked.join(", ")}`,
  );
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
