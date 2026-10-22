import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { z } from "zod";
import { FINDING_TYPES } from "../src/schema.ts";
import { indexRequirements } from "../src/mcp/requirements.ts";
const annotation = z.object({ findings: z.array(z.object({
  type: z.enum(FINDING_TYPES), requirement_id: z.string().nullable(), related_ids: z.array(z.string()).optional(),
})) });
test("all fixtures have valid annotations and contradictions name distinct existing requirements", async () => {
  for (const split of ["dev", "holdout"]) {
    const dir = new URL(`./${split}/`, import.meta.url);
    for (const file of (await readdir(dir)).filter(f => f.endsWith(".md") && f !== "README.md")) {
      const source = await readFile(new URL(file, dir), "utf8");
      const ids = new Set(indexRequirements(source).requirements.map(r => r.id));
      const expected = annotation.parse(JSON.parse(await readFile(new URL(file.replace(/\.md$/, ".expected.json"), dir), "utf8")));
      for (const finding of expected.findings) {
        assert.ok(finding.requirement_id === null || ids.has(finding.requirement_id), file);
        if (finding.type === "contradiction") {
          assert.ok(finding.related_ids?.length, file);
          for (const id of finding.related_ids!) {
            assert.ok(ids.has(id) && id !== finding.requirement_id, file);
          }
        }
      }
    }
  }
});
