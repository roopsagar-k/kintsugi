// Kintsugi domain types — the single source of truth for the API layer.
// Mirrors the Cloudant data model (§7) and the MCP-facing contract (docs/api-contract.md).

// ─── Enums ─────────────────────────────────────────────────────────────────────

export type TicketStatus = "Backlog" | "InProgress" | "InReview" | "Done" | "NeedsHuman"
export type Severity = "critical" | "high" | "medium" | "low"
export type RunStatus = "queued" | "running" | "passed" | "failed" | "error"
export type TestResultStatus = "passed" | "failed" | "timedOut" | "skipped"
export type ArtifactType = "screenshot" | "trace" | "diff"
export type TriageSource = "watsonx" | "heuristic" | "pending"
export type Trigger = "bob" | "ci" | "manual"
export type Actor = "bob" | "user" | "ci"

// Cloudant docs all carry these.
export interface CloudantMeta {
  _id: string
  _rev?: string
  type: CloudantType
}
export type CloudantType =
  | "user"
  | "project"
  | "apiKey"
  | "testPlan"
  | "testSpec"
  | "run"
  | "result"
  | "ticket"
  | "event"
  | "baseline"
  | "report"

// ─── Domain entities (Cloudant documents) ──────────────────────────────────────

export interface User extends CloudantMeta {
  type: "user"
  email: string
  name: string
  githubId?: string
  passwordHash?: string
  createdAt: string
}

export interface Project extends CloudantMeta {
  type: "project"
  ownerId: string
  name: string
  baseUrl: string
  createdAt: string
}

export interface ApiKey extends CloudantMeta {
  type: "apiKey"
  projectId: string
  hash: string // SHA-256 of the raw key — the raw key is never stored
  prefix: string // e.g. "kts_live_" + first chars, for display
  lastUsedAt?: string
  revoked: boolean
  createdAt: string
}

export interface PlanCase {
  id: string
  title: string
  steps: string[]
  expected: string
}
export interface PlanLane {
  name: string
  cases: PlanCase[]
}
export interface TestPlan extends CloudantMeta {
  type: "testPlan"
  projectId: string
  source: string // "code" | "PRD" | free text
  lanes: PlanLane[]
  createdAt: string
}

export interface TestSpec extends CloudantMeta {
  type: "testSpec"
  projectId: string
  lane: string
  path: string
  code: string
  version: number
  createdAt: string
}

export interface RunCounts {
  pass: number
  fail: number
  skip: number
}
export interface Run extends CloudantMeta {
  type: "run"
  projectId: string
  planId?: string
  status: RunStatus
  startedAt: string
  endedAt?: string
  counts?: RunCounts
  trigger: Trigger
}

export interface ConsoleMsg {
  type: string
  text: string
}
export interface NetworkEntry {
  method: string
  url: string
  status: number
}
export interface Result extends CloudantMeta {
  type: "result"
  projectId: string
  runId: string
  testId: string
  retryIndex: number
  title: string
  specFile: string
  line: number
  status: TestResultStatus
  durationMs: number
  error?: { message: string; stack?: string }
  console: ConsoleMsg[]
  network: NetworkEntry[]
  domSnippet?: string
  screenshotUrl?: string
  diffPct?: number
  diffUrl?: string
  createdAt: string
}

export interface Triage {
  cause: string
  area: string
  severity: Severity
  suspectedFiles?: string[]
  confidence?: number
  source: TriageSource
}
export interface TicketEvidence {
  kind: "screenshot" | "trace" | "diff" | "console" | "network"
  url?: string
  note?: string
}
export interface TicketHistoryEntry {
  ts: string
  actor: Actor
  from?: TicketStatus
  to?: TicketStatus
  note?: string
}
export interface Ticket extends CloudantMeta {
  type: "ticket"
  projectId: string
  title: string
  status: TicketStatus
  severity: Severity
  runId: string
  testId: string
  triage: Triage
  evidence: TicketEvidence[]
  attempts: number
  fixDiff?: string
  history: TicketHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface Event extends CloudantMeta {
  type: "event"
  projectId: string
  ts: string
  kind: string // "run.started" | "ticket.created" | "ticket.moved" | ...
  payload: Record<string, unknown>
}

export interface Baseline extends CloudantMeta {
  type: "baseline"
  projectId: string
  route: string
  viewport: string
  imageUrl: string
  approvedAt?: string
}

export interface Report extends CloudantMeta {
  type: "report"
  projectId: string
  runId: string
  html: string
  summary: Record<string, unknown>
  generatedAt: string
}

// ─── Request DTOs (from the MCP / dashboard) ────────────────────────────────────

export interface CreatePlanBody {
  source: string
  lanes: PlanLane[]
}
export interface CreateRunBody {
  planId?: string
  lanes?: string[]
  grep?: string
  trigger?: Trigger
}
export interface PatchRunBody {
  status: RunStatus
  counts?: RunCounts
  endedAt?: string
}
export interface PostResultBody {
  testId: string
  retryIndex: number
  title: string
  specFile: string
  line: number
  status: TestResultStatus
  durationMs: number
  error?: { message: string; stack?: string }
  console: ConsoleMsg[]
  network: NetworkEntry[]
  domSnippet?: string
  screenshotUrl?: string
  diffPct?: number
  diffUrl?: string
}
export interface PatchTicketBody {
  status?: TicketStatus
  note?: string
  fixDiff?: string
  actor?: Actor
}
export interface CreateReportBody {
  runId: string
}

// ─── Auth context resolved from the API key ─────────────────────────────────────

export interface ApiKeyAuth {
  ok: true
  projectId: string
  keyId: string
}
export interface ApiKeyAuthFailure {
  ok: false
  message: string
}
export type VerifyResult = ApiKeyAuth | ApiKeyAuthFailure
