import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { z } from "zod";

export const REQ_ID = /\bREQ-\d+\b/g;
const HEADING = /^#{1,6}\s+(REQ-\d+)\b[:\s-]*(.*)$/;

export interface IndexedRequirement {
  id: string;
  title: string;
  line: number;
  references: string[];
  has_acceptance_criteria: boolean;
}

export interface RequirementsIndex {
  requirements: IndexedRequirement[];
  duplicate_ids: string[];
  broken_references: { from: string; to: string }[];
  unreferenced: string[];
}

export function indexRequirements(markdown: string): RequirementsIndex {
  const lines = markdown.split(/\r?\n/);
  const requirements: IndexedRequirement[] = [];
  let current: (IndexedRequirement & { body: string[] }) | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n");
    const refs = new Set((body.match(REQ_ID) ?? []).filter((r) => r !== current!.id));
    requirements.push({
      id: current.id,
      title: current.title,
      line: current.line,
      references: [...refs].sort(),
      has_acceptance_criteria: /acceptance criteria|given\b.*\bwhen\b.*\bthen\b/is.test(body),
    });
    current = null;
  };

  lines.forEach((text, i) => {
    const m = text.match(HEADING);
    if (m) {
      flush();
      current = { id: m[1], title: m[2].trim(), line: i + 1, references: [], has_acceptance_criteria: false, body: [] };
    } else if (current) {
      current.body.push(text);
    }
  });
  flush();

  const ids = requirements.map((r) => r.id);
  const defined = new Set(ids);
  const duplicate_ids = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  const broken_references = requirements.flatMap((r) =>
    r.references.filter((to) => !defined.has(to)).map((to) => ({ from: r.id, to })),
  );
  const referenced = new Set(requirements.flatMap((r) => r.references));
  const unreferenced = ids.filter((id) => !referenced.has(id));

  return { requirements, duplicate_ids, broken_references, unreferenced };
}

export const requirementsIndexTool = tool(
  "requirements_index",
  "Parse a markdown requirements document and return a deterministic index: every REQ-NNN heading with its title, line number, outgoing references and whether it has acceptance criteria; plus duplicate ids, broken references (ids referenced but never defined) and requirements nothing refers to. Use this instead of counting ids by hand.",
  { path: z.string().describe("Absolute or cwd-relative path to the .md file") },
  async ({ path }) => {
    try {
      const index = indexRequirements(await readFile(path, "utf8"));
      return { content: [{ type: "text", text: JSON.stringify(index, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `requirements_index failed: ${(err as Error).message}` }], isError: true };
    }
  },
  { annotations: { readOnlyHint: true } },
);

export function extractNumericConstraints(markdown: string) {
  let requirement_id: string | null = null;
  return markdown.split(/\r?\n/).flatMap((text, i) => {
    const heading = text.match(HEADING);
    if (heading) { requirement_id = heading[1]; return []; }
    return [...text.matchAll(/\b\d+(?:[,.]\d+)*\s*(?:milliseconds?|ms|seconds?|minutes?|hours?|days?|rows?|MB|GB|%)(?![a-z])/gi)]
      .map(match => ({ requirement_id, line: i + 1, value: match[0], context: text.trim() }));
  });
}

export const numericConstraintsTool = tool(
  "numeric_constraints",
  "Extract explicit numeric limits with units, requirement IDs, source lines and context. Values are literal mentions, not inferred contradictions or normalized units.",
  { path: z.string() },
  async ({ path }) => ({ content: [{ type: "text", text: JSON.stringify(extractNumericConstraints(await readFile(path, "utf8"))) }] }),
  { annotations: { readOnlyHint: true } },
);

export const requirementsServer = createSdkMcpServer({
  name: "requirements",
  version: "0.1.0",
  tools: [requirementsIndexTool, numericConstraintsTool],
});
