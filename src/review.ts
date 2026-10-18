import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { reviewAgents } from "./agents.ts";
import { requirementsServer } from "./mcp/requirements.ts";
import { type ReviewReport, ReviewReportSchema, reviewReportJsonSchema } from "./schema.ts";

export interface ReviewOptions {
  file: string;
  model?: string;
  maxBudgetUsd?: number;
  maxTurns?: number;
  cache?: boolean;
  verbose?: boolean;
}

export interface ReviewRun {
  file: string;
  content_hash: string;
  report: ReviewReport;
  session_id?: string;
  cost_usd: number;
  turns: number;
  duration_ms: number;
  subagents_invoked: string[];
  cached: boolean;
}

export class ReviewError extends Error {
  constructor(message: string, readonly subtype?: string) {
    super(message);
  }
}

const CACHE_DIR = ".cache";
const RUNS_DIR = "runs";

export async function review(opts: ReviewOptions): Promise<ReviewRun> {
  const file = path.resolve(opts.file);
  const content = await readFile(file, "utf8");
  const content_hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  const cachePath = path.join(CACHE_DIR, `${content_hash}.json`);

  if (opts.cache !== false) {
    const hit = await readFile(cachePath, "utf8").catch(() => null);
    if (hit) return { ...(JSON.parse(hit) as ReviewRun), cached: true };
  }

  const run = await withRetry(() => runQuery(file, content_hash, opts), 3);

  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(RUNS_DIR, { recursive: true });
  await writeFile(cachePath, JSON.stringify(run, null, 2));
  await writeFile(path.join(RUNS_DIR, `${Date.now()}-${path.basename(file, ".md")}.json`), JSON.stringify(run, null, 2));
  return run;
}

async function runQuery(file: string, content_hash: string, opts: ReviewOptions): Promise<ReviewRun> {
  const started = Date.now();
  const subagents = new Set<string>();
  let result: SDKMessage | undefined;

  const agentNames = Object.keys(reviewAgents);
  const prompt = `Review the requirements document at ${file}.
Delegate to ALL of these subagents, in parallel, passing each the file path: ${agentNames.join(", ")}.
Do not review the document yourself. When all three have reported, merge their findings into the final JSON: drop exact duplicates, keep the "agent" field set to the subagent name that produced each finding, and write a two-sentence summary.`;

  for await (const message of query({
    prompt,
    options: {
      cwd: path.dirname(file),
      model: opts.model,
      systemPrompt: "You are the orchestrator of a requirements review. You only delegate and merge; you never analyse requirements yourself.",
      agents: reviewAgents,
      mcpServers: { requirements: requirementsServer },
      allowedTools: ["Read", "Agent", "mcp__requirements__requirements_index"],
      permissionMode: "dontAsk",
      maxTurns: opts.maxTurns ?? 30,
      maxBudgetUsd: opts.maxBudgetUsd ?? 2,
      outputFormat: { type: "json_schema", schema: reviewReportJsonSchema as Record<string, unknown> },
      env: { ...process.env, CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1" },
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use") {
          const input = block.input as { subagent_type?: string };
          if ((block.name === "Agent" || block.name === "Task") && input.subagent_type) subagents.add(input.subagent_type);
          if (opts.verbose) console.error(`[tool] ${block.name}${input.subagent_type ? ` → ${input.subagent_type}` : ""}`);
        }
      }
    }
    if (message.type === "result") result = message;
  }

  if (!result || result.type !== "result") throw new ReviewError("query ended without a result message");
  if (result.subtype !== "success") {
    throw new ReviewError(`review failed: ${result.subtype} after ${result.num_turns} turns ($${result.total_cost_usd.toFixed(3)})`, result.subtype);
  }

  const parsed = ReviewReportSchema.safeParse(result.structured_output);
  if (!parsed.success) throw new ReviewError(`structured output did not match schema: ${parsed.error.message}`);

  return {
    file,
    content_hash,
    report: parsed.data,
    session_id: result.session_id,
    cost_usd: result.total_cost_usd,
    turns: result.num_turns,
    duration_ms: Date.now() - started,
    subagents_invoked: [...subagents].sort(),
    cached: false,
  };
}

const NON_RETRYABLE = new Set(["error_max_turns", "error_max_budget_usd"]);

async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof ReviewError && err.subtype && NON_RETRYABLE.has(err.subtype)) throw err;
      if (/not logged in|invalid.*api key|authentication/i.test((err as Error).message)) throw err;
      const delay = 1000 * 2 ** i;
      console.error(`attempt ${i + 1}/${attempts} failed: ${(err as Error).message}; retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
