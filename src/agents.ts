import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { FINDING_TYPES } from "./schema.ts";

const SHARED = `Report findings as a JSON array (no prose around it). Each finding:
{"type": <one of ${FINDING_TYPES.join(" | ")}>, "requirement_id": "REQ-NNN" | null, "related_ids": [], "severity": "high"|"medium"|"low", "title": "...", "detail": "...", "suggestion": "..."}.
Only report defects you can point to in the text. Quote the offending phrase in "detail". If the document is clean for your dimension, return [].`;

export const reviewAgents: Record<string, AgentDefinition> = {
  "completeness-reviewer": {
    description: "Finds incomplete and ambiguous requirements: TBD/TODO placeholders, missing error paths, vague or unmeasurable wording.",
    prompt: `You review software requirements for completeness and clarity. Read the document at the path you are given.
Report type "incomplete" for: TBD/TODO/"to be defined", unspecified failure or edge behaviour the requirement clearly needs, missing actor or trigger.
Report type "ambiguity" for: vague qualifiers ("fast", "user-friendly", "appropriate", "etc.", "as needed", "should work well") and words with several readings where the choice matters.
Do NOT report missing acceptance criteria or cross-requirement conflicts; other reviewers own those.
${SHARED}`,
    tools: ["Read"],
    model: "sonnet",
  },
  "testability-reviewer": {
    description: "Checks that every requirement has verifiable acceptance criteria; reports missing_acceptance_criteria.",
    prompt: `You are a QA engineer reviewing requirements for testability. Read the document at the path you are given.
Call the requirements_index tool first: its has_acceptance_criteria flag tells you which requirements lack an explicit acceptance-criteria block. Then read the text to confirm.
Report type "missing_acceptance_criteria" for each requirement with no acceptance criteria or whose criteria cannot be turned into a pass/fail check (no numbers, no observable outcome).
Only report that one type.
${SHARED}`,
    tools: ["Read", "mcp__requirements__requirements_index"],
    model: "sonnet",
  },
  "consistency-reviewer": {
    description: "Finds contradictions between requirements and references to requirements that do not exist.",
    prompt: `You review requirements for internal consistency. Read the document at the path you are given.
Call the requirements_index tool first. Every entry in broken_references is a type "broken_reference" finding (requirement_id = from, related_ids = [to]). Duplicate ids are "broken_reference" too.
Call numeric_constraints to locate numeric limits, then compare their context in the full text. Different scopes or compatible units are not contradictions. Then read the full text and report type "contradiction" where two requirements cannot both hold (conflicting numbers, limits, timeouts, mutually exclusive behaviour). Put one id in requirement_id and the other(s) in related_ids.
Only report those two types.
${SHARED}`,
    tools: ["Read", "mcp__requirements__requirements_index", "mcp__requirements__numeric_constraints"],
    model: "sonnet",
  },
};
