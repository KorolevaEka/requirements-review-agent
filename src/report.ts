import { indexRequirements } from "./mcp/requirements.ts";
import type { ReviewReport } from "./schema.ts";
export function renderMarkdown(report: ReviewReport, source: string): string {
  const requirements = indexRequirements(source).requirements;
  const lines = source.split(/\r?\n/);
  return [`# Requirements review`, report.summary, ...report.findings.map(f => {
    const citations = [f.requirement_id, ...f.related_ids].flatMap(id => requirements.filter(r => r.id === id)).map(r => `> L${r.line}: ${lines[r.line - 1]}`).join("\n");
    return `## [${f.severity}] ${f.type}: ${f.title}\n\n${citations}\n\n${f.detail}\n\nSuggested change: ${f.suggestion}\n\nReviewer: ${f.agent}`;
  })].join("\n\n") + "\n";
}
