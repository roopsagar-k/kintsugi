/**
 * ApiClient — IKintsugiStore implementation that talks to the Kintsugi cloud API
 * (the Next.js dashboard). It maps between the MCP's internal shapes and the
 * dashboard's wire contract (durationMs/console/network/counts/trigger, _id, …).
 * Used when KINTSUGI_MODE !== "local".
 */
import type { IKintsugiStore } from "./interface.js";
import type {
  Plan,
  Run,
  Ticket,
  TicketDetail,
  FailureDetail,
  Artifact,
  Report,
  CreatePlanArgs,
  CreateRunArgs,
  PatchRunArgs,
  PostResultArgs,
  PatchTicketArgs,
  UploadArtifactArgs,
  Severity,
  TicketStatus,
  TriageResult,
  TriagePending,
} from "./types.js";

interface WireTriage {
  severity?: Severity;
  cause?: string;
  suspectedFiles?: string[];
  confidence?: number;
  source: "watsonx" | "heuristic" | "pending";
}

interface WireEvidence {
  kind: string;
  url?: string;
  note?: string;
}

function toTriage(w: WireTriage | undefined): TriageResult | TriagePending {
  if (!w) return { source: "pending" };
  if (w.source === "pending") return { source: "pending" };
  return {
    severity: w.severity as Severity,
    likelyCause: w.cause ?? "",
    suspectedFiles: w.suspectedFiles ?? [],
    confidence: w.confidence ?? 0.5,
    source: w.source,
  };
}

function screenshotFrom(evidence: WireEvidence[] | undefined): string | undefined {
  return evidence?.find((e) => e.kind === "screenshot")?.url;
}

function evidenceUrlFrom(evidence: WireEvidence[] | undefined, kind: string): string | undefined {
  return evidence?.find((e) => e.kind === kind)?.url;
}

function toTicket(w: {
  _id: string;
  title: string;
  severity: Severity;
  status: Ticket["status"];
  runId: string;
  testId: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
  fixDiff?: string;
}): Ticket {
  return {
    ticketId: w._id,
    title: w.title,
    severity: w.severity,
    status: w.status,
    runId: w.runId,
    testId: w.testId,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    note: w.note,
    fixDiff: w.fixDiff,
  };
}

export class ApiClient implements IKintsugiStore {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private projectId = "";

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetch(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async verifyKey(): Promise<{ projectId: string; projectName: string; plan: string }> {
    const data = await this.fetch("GET", "/api/v1/auth/verify");
    this.projectId = data.projectId;
    return data;
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  async createPlan(args: CreatePlanArgs): Promise<Plan> {
    const data = await this.fetch("POST", "/api/v1/plans", { source: args.source, lanes: args.lanes });
    return {
      planId: data.planId,
      projectId: this.projectId,
      source: args.source,
      lanes: args.lanes,
      dashboardUrl: data.dashboardUrl,
      createdAt: data.createdAt,
    };
  }

  // ── Runs ──────────────────────────────────────────────────────────────────
  async createRun(args: CreateRunArgs): Promise<Run> {
    const data = await this.fetch("POST", "/api/v1/runs", {
      planId: args.planId,
      lanes: args.lanes,
      grep: args.grep,
      trigger: args.triggeredBy ?? "bob",
    });
    return {
      runId: data.runId,
      projectId: this.projectId,
      planId: args.planId,
      status: data.status,
      lanes: args.lanes,
      grep: args.grep,
      triggeredBy: args.triggeredBy ?? "bob",
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    };
  }

  async patchRun(runId: string, args: PatchRunArgs): Promise<Run> {
    const counts = args.summary
      ? { pass: args.summary.passed, fail: args.summary.failed, skip: args.summary.skipped }
      : undefined;
    const data = await this.fetch("PATCH", `/api/v1/runs/${runId}`, {
      status: args.status,
      counts,
      endedAt: args.summary ? new Date().toISOString() : undefined,
    });
    return {
      runId: data.runId,
      projectId: this.projectId,
      status: data.status,
      triggeredBy: "bob",
      summary: args.summary,
      createdAt: data.updatedAt,
      updatedAt: data.updatedAt,
    };
  }

  async getRun(runId: string): Promise<Run> {
    const d = await this.fetch("GET", `/api/v1/runs/${runId}`);
    const summary = d.counts
      ? {
          total: d.counts.pass + d.counts.fail + d.counts.skip,
          passed: d.counts.pass,
          failed: d.counts.fail,
          skipped: d.counts.skip,
          duration: 0,
          ticketIds: [],
        }
      : undefined;
    return {
      runId: d.runId,
      projectId: this.projectId,
      status: d.status,
      triggeredBy: "bob",
      summary,
      createdAt: d.startedAt,
      updatedAt: d.endedAt ?? d.startedAt,
    };
  }

  // ── Results ───────────────────────────────────────────────────────────────
  async postResult(args: PostResultArgs): Promise<{ resultId: string; ticketId?: string }> {
    return this.fetch("POST", `/api/v1/runs/${args.runId}/results`, {
      testId: args.testId,
      retryIndex: args.retryIndex,
      title: args.title,
      specFile: args.specFile,
      line: args.line,
      status: args.status,
      durationMs: args.duration,
      error: args.error,
      console: args.consoleErrors,
      network: args.failedRequests,
      domSnippet: args.domSnippet,
      screenshotUrl: args.screenshotUrl,
      traceUrl: args.traceUrl,
      videoUrl: args.videoUrl,
    });
  }

  // ── Failures ──────────────────────────────────────────────────────────────
  async getFailures(runId: string, severity?: Severity): Promise<FailureDetail[]> {
    const qs = severity ? `?severity=${severity}` : "";
    const data = await this.fetch("GET", `/api/v1/runs/${runId}/failures${qs}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.failures.map((f: any) => ({
      ticketId: f.ticketId ?? "",
      severity: f.severity,
      testTitle: f.title,
      specFile: f.specFile,
      line: f.line,
      errorMessage: f.error?.message ?? "",
      consoleErrors: (f.evidence ?? [])
        .filter((e: WireEvidence) => e.kind === "console")
        .map((e: WireEvidence) => e.note ?? ""),
      failedRequests: [],
      triage: toTriage(f.triage),
      screenshotUrl: screenshotFrom(f.evidence),
      traceUrl: evidenceUrlFrom(f.evidence, "trace"),
      videoUrl: evidenceUrlFrom(f.evidence, "video"),
    }));
  }

  // ── Tickets ───────────────────────────────────────────────────────────────
  async listTickets(_projectId: string, status?: TicketStatus): Promise<Ticket[]> {
    const qs = status ? `?status=${status}` : "";
    const data = await this.fetch("GET", `/api/v1/tickets${qs}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.tickets.map(toTicket as (w: any) => Ticket);
  }

  async getTicket(ticketId: string): Promise<TicketDetail> {
    const w = await this.fetch("GET", `/api/v1/tickets/${ticketId}`);
    const failure: FailureDetail = {
      ticketId: w._id,
      severity: w.severity,
      testTitle: w.title,
      specFile: "",
      line: 0,
      errorMessage: "",
      consoleErrors: [],
      failedRequests: [],
      triage: toTriage(w.triage),
      screenshotUrl: screenshotFrom(w.evidence),
      traceUrl: evidenceUrlFrom(w.evidence, "trace"),
      videoUrl: evidenceUrlFrom(w.evidence, "video"),
    };
    return { ...toTicket(w), triage: toTriage(w.triage), failures: [failure] };
  }

  async patchTicket(ticketId: string, args: PatchTicketArgs): Promise<Ticket> {
    const w = await this.fetch("PATCH", `/api/v1/tickets/${ticketId}`, {
      status: args.status,
      note: args.note,
      fixDiff: args.fixDiff,
      actor: "bob",
    });
    return toTicket(w);
  }

  // ── Artifacts ──────────────────────────────────────────────────────────────
  async uploadArtifact(args: UploadArtifactArgs): Promise<Artifact> {
    const { readFileSync } = await import("node:fs");
    const form = new FormData();
    form.append("runId", args.runId);
    form.append("testId", args.testId);
    form.append("type", args.type);
    const fileBytes = readFileSync(args.filePath);
    form.append("file", new Blob([new Uint8Array(fileBytes)]), args.filePath.split("/").pop() ?? "file");
    const res = await fetch(`${this.baseUrl}/api/v1/artifacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API POST /api/v1/artifacts → ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as { artifactId: string; url: string };
    return { artifactId: data.artifactId, url: data.url };
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  async createReport(runId: string): Promise<Report> {
    const data = await this.fetch("POST", "/api/v1/reports", { runId });
    return { reportId: data.reportId, url: data.url, generatedAt: data.generatedAt };
  }
}
