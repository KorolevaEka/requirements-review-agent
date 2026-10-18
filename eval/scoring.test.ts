import test from "node:test";
import assert from "node:assert/strict";
import { matches, score } from "./scoring.ts";
import type { Finding } from "../src/schema.ts";
const finding: Finding = { type: "contradiction", requirement_id: "REQ-001", related_ids: ["REQ-002"], severity: "high", title: "Conflict", detail: "Conflicting values", suggestion: "Align", agent: "consistency-reviewer" };
test("contradictions match the pair in either orientation, never an unrelated pair", () => {
  assert.ok(matches(finding, { type: "contradiction", requirement_id: "REQ-002", related_id: "REQ-001" }));
  assert.ok(!matches(finding, { type: "contradiction", requirement_id: "REQ-001", related_id: "REQ-003" }));
  assert.ok(!matches(finding, { type: "ambiguity", requirement_id: "REQ-002" }));
});
test("one finding cannot satisfy two expected findings", () => {
  const e = { type: "contradiction" as const, requirement_id: "REQ-001", related_id: "REQ-002" };
  const result = score([finding], [e, e]);
  assert.equal(result.tp, 1);
  assert.equal(result.fn, 1);
});
