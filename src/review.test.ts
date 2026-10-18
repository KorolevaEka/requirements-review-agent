import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { review } from "./review.ts";

test("Codex runner validates output, caches by model, and reports CLI failures", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "review-test-"));
  const previousCwd = process.cwd();
  const previousPath = process.env.PATH;
  try {
    const executable = path.join(directory, "codex");
    await writeFile(executable, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('codex-cli test'); process.exit(0); }
let prompt = '';
process.stdin.on('data', c => prompt += c);
process.stdin.on('end', () => {
  const root = path.dirname(process.argv[1]);
  fs.appendFileSync(path.join(root, 'calls'), 'call\\n');
  if (!prompt.includes('REQ-001') || !prompt.includes('broken_references') || args[args.indexOf('--sandbox') + 1] !== 'read-only') process.exit(4);
  const model = args[args.indexOf('--model') + 1];
  if (model === 'slow') { setTimeout(() => {}, 60000); return; }
  if (model === 'failure') { console.error('test failure'); process.exit(7); }
  const output = model === 'invalid' ? {summary: 5} : {summary: 'Reviewed.', findings: []};
  fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], JSON.stringify(output));
});
`);
    await chmod(executable, 0o755);
    process.env.PATH = `${directory}${path.delimiter}${previousPath}`;
    process.chdir(directory);
    await writeFile("requirements.md", "## REQ-001 Example\nSee REQ-099.");
    const first = await review({ file: "requirements.md", model: "test" });
    assert.equal(first.cached, false);
    assert.equal(first.cost_usd, null);
    assert.equal((await review({ file: "requirements.md", model: "test" })).cached, true);
    assert.equal((await readFile("calls", "utf8")).trim().split("\n").length, 1);
    await review({ file: "requirements.md", model: "different" });
    assert.equal((await readFile("calls", "utf8")).trim().split("\n").length, 2);
    await assert.rejects(review({ file: "requirements.md", model: "invalid" }));
    await assert.rejects(review({ file: "requirements.md", model: "slow", timeoutMs: 50 }), /timed out/);
    const controller = new AbortController();
    const pending = review({ file: "requirements.md", model: "slow", signal: controller.signal });
    const timer = setTimeout(() => controller.abort(), 200);
    try { await assert.rejects(pending, /cancelled/); } finally { clearTimeout(timer); }
    await assert.rejects(review({ file: "requirements.md", model: "failure" }), /code 7.*test failure/s);
  } finally {
    process.chdir(previousCwd);
    process.env.PATH = previousPath;
    await rm(directory, { recursive: true, force: true });
  }
});
