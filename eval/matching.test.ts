import { test } from "node:test";
import assert from "node:assert/strict";
import { matches } from "./matching.ts";
import type { Finding } from "../src/schema.ts";
test("contradictions match complete unordered pairs, other types match primary ID", () => {
  const finding = { type: "contradiction", requirement_id: "REQ-002", related_ids: ["REQ-001"] } as Finding;
  assert.ok(matches(finding, { type: "contradiction", requirement_id: "REQ-001", related_ids: ["REQ-002"] }));
  assert.equal(matches(finding, { type: "contradiction", requirement_id: "REQ-002", related_ids: ["REQ-003"] }), false);
  assert.equal(matches({ ...finding, type: "broken_reference" }, { type: "broken_reference", requirement_id: "REQ-001" }), false);
});
