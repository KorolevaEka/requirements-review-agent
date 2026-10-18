import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { review } from "../src/review.ts";
import type { Finding } from "../src/schema.ts";

interface Expected { type: Finding["type"]; requirement_id: string | null }
interface CaseResult { name: string; tp: number; fp: number; fn: number; cost_usd: number | null; missed: Expected[]; extra: Expected[] }

const { values } = parseArgs({
  options: {
    case: { type: "string" },
    "no-cache": { type: "boolean", default: false },
  },
});

const casesDir = path.join(import.meta.dirname, "cases");
const names = (await readdir(casesDir))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""))
  .filter((n) => !values.case || n === values.case);

const matches = (f: Finding, e: Expected) =>
  f.type === e.type && (f.requirement_id === e.requirement_id || (e.requirement_id !== null && f.related_ids.includes(e.requirement_id)));

const results: CaseResult[] = [];
for (const name of names) {
  const expected: Expected[] = JSON.parse(await readFile(path.join(casesDir, `${name}.expected.json`), "utf8")).findings;
  const run = await review({ file: path.join(casesDir, `${name}.md`), cache: !values["no-cache"] });
  const found = run.report.findings;

  const matched = new Set<Finding>();
  const missed = expected.filter((e) => {
    const hit = found.find((f) => !matched.has(f) && matches(f, e));
    if (hit) matched.add(hit);
    return !hit;
  });
  const extra = found.filter((f) => !matched.has(f)).map((f) => ({ type: f.type, requirement_id: f.requirement_id }));

  const r: CaseResult = { name, tp: matched.size, fp: extra.length, fn: missed.length, cost_usd: run.cost_usd, missed, extra };
  results.push(r);
  console.log(`${name.padEnd(28)} tp=${r.tp} fp=${r.fp} fn=${r.fn}${run.cached ? " (cached)" : " (Codex; cost unavailable)"}`);
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
await writeFile(path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify({ precision, recall, results }, null, 2));
