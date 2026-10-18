import { z } from "zod";

export const FINDING_TYPES = [
  "ambiguity",
  "incomplete",
  "missing_acceptance_criteria",
  "contradiction",
  "broken_reference",
] as const;

export const FindingSchema = z.object({
  type: z.enum(FINDING_TYPES),
  requirement_id: z.string().nullable().describe("Primary REQ id, null when document-level"),
  related_ids: z.array(z.string()).default([]),
  severity: z.enum(["high", "medium", "low"]),
  title: z.string(),
  detail: z.string(),
  suggestion: z.string(),
  agent: z.string().describe("Which subagent produced the finding"),
});

export const ReviewReportSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
});

export type Finding = z.infer<typeof FindingSchema>;
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

const { $schema: _draft, ...jsonSchema } = z.toJSONSchema(ReviewReportSchema);
export const reviewReportJsonSchema = jsonSchema;
