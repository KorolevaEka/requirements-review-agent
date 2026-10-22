import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { renderMarkdown } from "./report.ts";
import { readFile } from "node:fs/promises";
import { review } from "./review.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    markdown: { type: "string" },
    timeout: { type: "string", default: "120000" },
    "agent-model": { type: "string", default: "sonnet" },
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

const controller = new AbortController();
const interrupt = () => controller.abort(new Error("Interrupted"));
process.once("SIGINT", interrupt);
try {
  if (!["sonnet", "haiku"].includes(values["agent-model"]!)) throw new Error("Unknown agent model");
  if (!Number.isFinite(Number(values.budget)) || Number(values.budget) <= 0) throw new Error("budget must be positive");
  const run = await review({
    file,
    signal: controller.signal,
    timeoutMs: Number(values.timeout),
    agentModel: values["agent-model"] as "sonnet" | "haiku",
    model: values.model,
    maxBudgetUsd: Number(values.budget),
    cache: !values["no-cache"],
    verbose: values.verbose,
  });

  if (values.markdown) await writeFile(values.markdown, renderMarkdown(run.report, await readFile(file, "utf8")));
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
  process.exitCode = controller.signal.aborted ? 130 : 1;
}

finally { process.removeListener("SIGINT", interrupt); }
