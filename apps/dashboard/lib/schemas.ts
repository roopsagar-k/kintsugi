import { z } from "zod"

// Zod schemas for every request body the API accepts. Route handlers validate
// with these before touching Cloudant, so the persistence TODO(bob) blocks can
// assume well-formed input.

export const PlanCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
  expected: z.string(),
})

export const PlanLaneSchema = z.object({
  name: z.string(),
  cases: z.array(PlanCaseSchema),
})

export const CreatePlanSchema = z.object({
  source: z.string().min(1),
  lanes: z.array(PlanLaneSchema),
})

export const CreateRunSchema = z.object({
  planId: z.string().optional(),
  lanes: z.array(z.string()).optional(),
  grep: z.string().optional(),
  trigger: z.enum(["bob", "ci", "manual"]).optional(),
})

export const PatchRunSchema = z.object({
  status: z.enum(["queued", "running", "passed", "failed", "error"]),
  counts: z
    .object({ pass: z.number().int(), fail: z.number().int(), skip: z.number().int() })
    .optional(),
  endedAt: z.string().optional(),
})

export const PostResultSchema = z.object({
  testId: z.string(),
  retryIndex: z.number().int().min(0),
  title: z.string(),
  specFile: z.string(),
  line: z.number().int(),
  status: z.enum(["passed", "failed", "timedOut", "skipped"]),
  durationMs: z.number(),
  error: z.object({ message: z.string(), stack: z.string().optional() }).optional(),
  console: z.array(z.object({ type: z.string(), text: z.string() })).default([]),
  network: z
    .array(z.object({ method: z.string(), url: z.string(), status: z.number().int() }))
    .default([]),
  domSnippet: z.string().optional(),
  screenshotUrl: z.string().optional(),
  traceUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  diffPct: z.number().optional(),
  diffUrl: z.string().optional(),
})

export const PatchTicketSchema = z.object({
  status: z.enum(["Backlog", "InProgress", "InReview", "Done", "NeedsHuman"]).optional(),
  note: z.string().optional(),
  fixDiff: z.string().optional(),
  actor: z.enum(["bob", "user", "ci"]).optional(),
})

export const CreateReportSchema = z.object({
  runId: z.string(),
})

// Query-param helpers
export const SeverityEnum = z.enum(["critical", "high", "medium", "low"])
export const TicketStatusEnum = z.enum(["Backlog", "InProgress", "InReview", "Done", "NeedsHuman"])
