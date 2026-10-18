import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { review } from "../src/review.ts";
import { score, type Expected } from "./scoring.ts";

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());

const { values } = parseArgs({ options: {
  case: { type: "string" },
  model: { type: "string" },
  repeat: { type: "string", default: "1" },
  suite: { type: "string", default: "cases" },
  "no-cache": { type: "boolean", default: false },
} });
const repetitions = Number(values.repeat);
if (!Number.isInteger(repetitions) || repetitions < 1) throw new Error("--repeat must be a positive integer");
if (!["cases", "holdout"].includes(values.suite!)) throw new Error("--suite must be cases or holdout");
const casesDir = path.join(import.meta.dirname, values.suite!);
const names = (await readdir(casesDir)).filter(f => f.endsWith(".md")).map(f => f.slice(0, -3)).sort().filter(n => !values.case || n === values.case);
if (!names.length) throw new Error(`No eval cases match: ${values.case ?? values.suite}`);
if (!values.model) throw new Error("Specify --model MODEL for reproducible evaluation");
type CaseResult = ReturnType<typeof score> & { name: string; repetition: number; duration_ms: number; cached: boolean; cli_version: string };
const results: CaseResult[] = [];
for (let repetition = 1; repetition <= repetitions; repetition++) {
  for (const name of names) {
    const expected: Expected[] = JSON.parse(await readFile(path.join(casesDir, `${name}.expected.json`), "utf8")).findings;
    const run = await review({ file: path.join(casesDir, `${name}.md`), model: values.model, signal: controller.signal, cache: repetitions === 1 && !values["no-cache"] });
    const result = { name, repetition, ...score(run.report.findings, expected), duration_ms: run.duration_ms, cached: run.cached, cli_version: run.cli_version };
    results.push(result);
    console.log(`[${repetition}/${repetitions}] ${name}: tp=${result.tp} fp=${result.fp} fn=${result.fn}${run.cached ? " (cached)" : ""}`);
  }
}
const metrics = (rows: typeof results) => {
  const tp = rows.reduce((s, r) => s + r.tp, 0), fp = rows.reduce((s, r) => s + r.fp, 0), fn = rows.reduce((s, r) => s + r.fn, 0);
  return { tp, fp, fn, precision: tp / Math.max(1, tp + fp), recall: tp / Math.max(1, tp + fn) };
};
const aggregate = metrics(results);
const per_run = Array.from({ length: repetitions }, (_, i) => ({ repetition: i + 1, ...metrics(results.filter(r => r.repetition === i + 1)) }));
console.log(`precision ${(aggregate.precision * 100).toFixed(1)}% recall ${(aggregate.recall * 100).toFixed(1)}% (${names.length} cases × ${repetitions} runs)`);
const dataset_hash = (await import("node:crypto")).createHash("sha256");
for (const name of names) for (const extension of ["md", "expected.json"]) dataset_hash.update(await readFile(path.join(casesDir, `${name}.${extension}`)));
const outDir = path.join(import.meta.dirname, "results");
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify({ provider: "codex", model: values.model, suite: values.suite, dataset_hash: dataset_hash.digest("hex"), repetitions, ...aggregate, per_run, results }, null, 2));
