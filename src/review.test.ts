import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { review } from "./review.ts";
import type { query } from "@anthropic-ai/claude-agent-sdk";

test("orchestrator validates output, budget, timeout, cancellation and cache policy without API", async () => {
  const previous = process.cwd();
  const dir = await mkdtemp(path.join(tmpdir(), "review-test-"));
  process.chdir(dir);
  try {
    await writeFile("doc.md", "# REQ-001: Test\nA test.");
    let calls = 0;
    const fake = (result: unknown) => (async function* () { calls++; yield result; }) as unknown as typeof query;
    const success = { type: "result", subtype: "success", structured_output: { summary: "Clean", findings: [] }, num_turns: 1, total_cost_usd: 0, session_id: "test" };
    await assert.rejects(review({ file: "doc.md" }, fake({ ...success, subtype: "error_max_budget_usd" })), /error_max_budget_usd/);
    assert.equal(calls, 1);
    calls = 0;
    await assert.rejects(review({ file: "doc.md" }, fake({ ...success, structured_output: "bad JSON" })), /schema/);
    assert.equal(calls, 1);
    await assert.rejects(readdir(".cache"), { code: "ENOENT" });
    const controller = new AbortController(); controller.abort();
    await assert.rejects(review({ file: "doc.md", signal: controller.signal }, fake(success)));
    assert.equal(calls, 1);
    const blocking = (async function* (args: Parameters<typeof query>[0]) {
      const signal = args.options!.abortController!.signal;
      await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      yield success;
    }) as unknown as typeof query;
    await assert.rejects(review({ file: "doc.md", timeoutMs: 10 }, blocking), /timeout/);
    const run = await review({ file: "doc.md", cache: false }, fake(success));
    assert.equal(run.cached, false);
    await assert.rejects(readdir(".cache"), { code: "ENOENT" });
    await review({ file: "doc.md" }, fake(success));
    const before = calls;
    assert.equal((await review({ file: "doc.md" }, fake(success))).cached, true);
    assert.equal(calls, before);
    await review({ file: "doc.md", agentModel: "haiku" }, fake(success));
    assert.equal(calls, before + 1);
    assert.ok((await readdir("runs")).some(f => f.endsWith(".trace.jsonl")));
  } finally { process.chdir(previous); await rm(dir, { recursive: true, force: true }); }
});
