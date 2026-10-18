import type { Finding } from "../src/schema.ts";

export interface Expected {
  type: Finding["type"];
  requirement_id: string | null;
  related_id?: string;
}

export function matches(f: Finding, e: Expected): boolean {
  if (f.type !== e.type) return false;
  if (e.related_id) {
    return (f.requirement_id === e.requirement_id && f.related_ids.includes(e.related_id)) ||
      (e.type === "contradiction" && f.requirement_id === e.related_id && e.requirement_id !== null && f.related_ids.includes(e.requirement_id));
  }
  return f.requirement_id === e.requirement_id;
}

export function score(found: Finding[], expected: Expected[]) {
  const matched = new Set<Finding>();
  const missed = expected.filter(e => {
    const hit = found.find(f => !matched.has(f) && matches(f, e));
    if (hit) matched.add(hit);
    return !hit;
  });
  const extra = found.filter(f => !matched.has(f));
  return { tp: matched.size, fp: extra.length, fn: missed.length, missed, extra };
}
