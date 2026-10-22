import type { Finding } from "../src/schema.ts";
export interface Expected { type: Finding["type"]; requirement_id: string | null; related_ids?: string[] }
export function matches(f: Finding, e: Expected): boolean {
  if (f.type !== e.type) return false;
  if (e.type !== "contradiction") return f.requirement_id === e.requirement_id;
  const ids = (primary: string | null, related: string[] = []) => [...new Set([primary, ...related])].sort().join("|");
  return ids(f.requirement_id, f.related_ids) === ids(e.requirement_id, e.related_ids);
}
