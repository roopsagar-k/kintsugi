export type TicketStatus = "Backlog" | "InProgress" | "InReview" | "Done" | "NeedsHuman";
export type Severity = "critical" | "high" | "medium" | "low";
export type RunStatus = "queued" | "running" | "passed" | "failed" | "error";
export type TestResultStatus = "passed" | "failed" | "timedOut" | "skipped";
export type ArtifactType = "screenshot" | "trace" | "video" | "diff";
export type TriageSource = "watsonx" | "heuristic" | "pending";

export interface TriageResult {
  severity: Severity;
  likelyCause: string;
  suspectedFiles: string[];
  confidence: number;
  source: "watsonx" | "heuristic";
}

export interface TriagePending {
  source: "pending";
}

export interface ConsoleMsg {
  type: string;
  text: string;
}

export interface FailedReq {
  method: string;
  url: string;
  status: number;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  ticketIds: string[];
}

export interface Plan {
  planId: string;
  projectId: string;
  source: string;
  lanes: PlanLane[];
  dashboardUrl: string;
  createdAt: string;
}

export interface PlanLane {
  name: string;
  cases: PlanCase[];
}

export interface PlanCase {
  id: string;
  title: string;
  steps: string[];
  expected: string;
}

export interface Run {
  runId: string;
  projectId: string;
  planId?: string;
  status: RunStatus;
  lanes?: string[];
  grep?: string;
  triggeredBy: "bob" | "ci" | "manual";
  summary?: RunSummary;
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  resultId: string;
  runId: string;
  testId: string;
  retryIndex: number;
  title: string;
  specFile: string;
  line: number;
  status: TestResultStatus;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  consoleErrors: ConsoleMsg[];
  failedRequests: FailedReq[];
  domSnippet?: string;
  screenshotUrl?: string;
  tracePath?: string;
  traceUrl?: string;
  videoUrl?: string;
  triage?: TriageResult | TriagePending;
  ticketId?: string;
  createdAt: string;
}

export interface Ticket {
  ticketId: string;
  title: string;
  severity: Severity;
  status: TicketStatus;
  runId: string;
  testId: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
  fixDiff?: string;
}

export interface TicketDetail extends Ticket {
  triage: TriageResult | TriagePending;
  failures: FailureDetail[];
}

export interface FailureDetail {
  ticketId: string;
  severity: Severity;
  testTitle: string;
  specFile: string;
  line: number;
  errorMessage: string;
  consoleErrors: string[];
  failedRequests: FailedReq[];
  domSnippet?: string;
  triage: TriageResult | TriagePending;
  screenshotPath?: string;
  screenshotUrl?: string;
  traceUrl?: string;
  videoUrl?: string;
  evidenceUrl?: string;
}

export interface Artifact {
  artifactId: string;
  url: string;
}

export interface Report {
  reportId: string;
  url: string;
  generatedAt: string;
}

export interface CreatePlanArgs {
  projectId: string;
  source: string;
  lanes: PlanLane[];
}

export interface CreateRunArgs {
  projectId: string;
  planId?: string;
  lanes?: string[];
  grep?: string;
  triggeredBy?: "bob" | "ci" | "manual";
}

export interface PatchRunArgs {
  status: RunStatus;
  summary?: RunSummary;
}

export interface PostResultArgs {
  runId: string;
  testId: string;
  retryIndex: number;
  title: string;
  specFile: string;
  line: number;
  status: TestResultStatus;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  consoleErrors: ConsoleMsg[];
  failedRequests: FailedReq[];
  domSnippet?: string;
  screenshotUrl?: string;
  tracePath?: string;
  traceUrl?: string;
  videoUrl?: string;
}

export interface PatchTicketArgs {
  status?: TicketStatus;
  note?: string;
  fixDiff?: string;
}

export interface UploadArtifactArgs {
  runId: string;
  testId: string;
  type: ArtifactType;
  filePath: string;
}
