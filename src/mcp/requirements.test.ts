import assert from "node:assert/strict";
import { test } from "node:test";
import { indexRequirements } from "./requirements.ts";

test("indexes ids, references, acceptance criteria, broken and unreferenced", () => {
  const doc = `# Spec
### REQ-001: Login
User logs in. See REQ-002.
**Acceptance criteria**
- Given valid creds, when submit, then dashboard.

### REQ-002: Lockout
Lock after 5 failures. Related to REQ-009.

### REQ-002: Duplicate
Oops.
`;
  const idx = indexRequirements(doc);
  assert.deepEqual(idx.requirements.map((r) => r.id), ["REQ-001", "REQ-002", "REQ-002"]);
  assert.equal(idx.requirements[0].has_acceptance_criteria, true);
  assert.equal(idx.requirements[1].has_acceptance_criteria, false);
  assert.deepEqual(idx.requirements[0].references, ["REQ-002"]);
  assert.deepEqual(idx.duplicate_ids, ["REQ-002"]);
  assert.deepEqual(idx.broken_references, [{ from: "REQ-002", to: "REQ-009" }]);
  assert.deepEqual(idx.unreferenced, ["REQ-001"]);
});
