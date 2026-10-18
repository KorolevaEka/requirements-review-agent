import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { review } from "./review.ts";

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", short: "o" },
    model: { type: "string" },
    "no-cache": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

const file = positionals[0];
if (!file) {
  console.error("usage: pnpm review <requirements.md> [--out report.json] [--model MODEL] [--no-cache] [-v]");
  process.exit(2);
}

try {
  const run = await review({
    file,
    signal: controller.signal,
    model: values.model,
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
      : `${run.report.findings.length} findings · ${(run.duration_ms / 1000).toFixed(0)}s · perspectives: ${run.review_perspectives.join(", ")}`,
  );
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
