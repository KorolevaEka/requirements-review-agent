import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { review } from "../src/review.ts";
import { matches, type Expected } from "./matching.ts";
import type { Finding } from "../src/schema.ts";

interface CaseResult { name: string; tp: number; fp: number; fn: number; cost_usd: number; missed: Expected[]; extra: Expected[] }

const { values } = parseArgs({
  options: {
    case: { type: "string" },
    split: { type: "string", default: "dev" },
    repeats: { type: "string", default: "1" },
    model: { type: "string" },
    "agent-model": { type: "string", default: "sonnet" },
    "no-cache": { type: "boolean", default: false },
  },
});

if (!["dev", "holdout"].includes(values.split!)) throw new Error("Unknown split");
const repeats = Number(values.repeats);
if (!Number.isInteger(repeats) || repeats < 1) throw new Error("repeats must be a positive integer");
if (!["sonnet", "haiku"].includes(values["agent-model"]!)) throw new Error("Unknown agent model");
const casesDir = path.join(import.meta.dirname, values.split!);
const names = (await readdir(casesDir))
  .filter((f) => f.endsWith(".md") && f !== "README.md")
  .map((f) => f.replace(/\.md$/, ""))
  .filter((n) => !values.case || n === values.case);

if (!names.length) throw new Error(`No cases matched: ${values.case ?? values.split}`);
const controller = new AbortController();
process.once("SIGINT", () => controller.abort(new Error("Interrupted")));
const samples: { precision: number; recall: number }[] = [];
for (let iteration = 1; iteration <= repeats; iteration++) {
  const results: CaseResult[] = [];
  for (const name of names) {
    const expected: Expected[] = JSON.parse(await readFile(path.join(casesDir, `${name}.expected.json`), "utf8")).findings;
    const run = await review({ file: path.join(casesDir, `${name}.md`), cache: repeats === 1 && !values["no-cache"], model: values.model, agentModel: values["agent-model"] as "sonnet" | "haiku", signal: controller.signal });
    const found = run.report.findings;

    const matched = new Set<Finding>();
    const missed = expected.filter((e) => {
      const hit = found.find((f) => !matched.has(f) && matches(f, e));
      if (hit) matched.add(hit);
      return !hit;
    });
    const extra = found.filter((f) => !matched.has(f)).map((f) => ({ type: f.type, requirement_id: f.requirement_id, related_ids: f.related_ids }));

    const r: CaseResult = { name, tp: matched.size, fp: extra.length, fn: missed.length, cost_usd: run.cost_usd, missed, extra };
    results.push(r);
    console.log(`${name.padEnd(28)} tp=${r.tp} fp=${r.fp} fn=${r.fn}${run.cached ? " (cached)" : ` $${run.cost_usd.toFixed(3)}`}`);
    for (const m of missed) console.log(`    missed: ${m.type} ${m.requirement_id}`);
    for (const x of extra) console.log(`    extra:  ${x.type} ${x.requirement_id}`);
  }

  const tp = results.reduce((s, r) => s + r.tp, 0);
  const fp = results.reduce((s, r) => s + r.fp, 0);
  const fn = results.reduce((s, r) => s + r.fn, 0);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  console.log(`\nprecision ${(precision * 100).toFixed(0)}%  recall ${(recall * 100).toFixed(0)}%  (tp=${tp} fp=${fp} fn=${fn}, ${results.length} cases)`);

  const outDir = path.join(import.meta.dirname, "results");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify({ split: values.split, model: values.model, agent_model: values["agent-model"], iteration, precision, recall, results }, null, 2));

  samples.push({ precision, recall });
}
for (const metric of ["precision", "recall"] as const) {
  const values = samples.map(s => s[metric]);
  console.log(`${metric}: min=${Math.min(...values).toFixed(3)} max=${Math.max(...values).toFixed(3)} mean=${(values.reduce((a,b) => a+b,0)/values.length).toFixed(3)}`);
}
