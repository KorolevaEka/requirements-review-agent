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
