import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { triageFailure } from "../triage/index.js";
import { logger } from "../lib/logger.js";
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

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function writeJson(path: string, data: unknown): void {
  const dir = join(path, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf-8"));
}

/**
 * LocalStore — implements IKintsugiStore by writing JSON files under
 * {projectRoot}/.kintsugi/.local/
 *
 * Layout:
 *   plans/{planId}.json
 *   runs/{runId}/run.json
 *   runs/{runId}/results/{testId}-{retryIndex}.json
 *   tickets/{ticketId}.json
 *   artifacts/{runId}/{filename}
 *   reports/{runId}.html
 */
export class LocalStore implements IKintsugiStore {
  private readonly root: string;
  // projectId is fixed for local mode
  private readonly projectId = "local";

  constructor(projectRoot: string) {
    this.root = join(projectRoot, ".kintsugi", ".local");
    mkdirSync(this.root, { recursive: true });
  }

  private path(...parts: string[]): string {
    return join(this.root, ...parts);
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  async verifyKey(): Promise<{ projectId: string; projectName: string; plan: string }> {
    return { projectId: this.projectId, projectName: "local", plan: "local" };
  }

  // ── Plans ───────────────────────────────────────────────────────────────
  async createPlan(args: CreatePlanArgs): Promise<Plan> {
    const planId = `plan_${uuid()}`;
    const plan: Plan = {
      planId,
      projectId: this.projectId,
      source: args.source,
      lanes: args.lanes,
      dashboardUrl: `file://${this.path("plans", planId + ".json")}`,
      createdAt: now(),
    };
    writeJson(this.path("plans", planId + ".json"), plan);
    return plan;
  }

  // ── Runs ────────────────────────────────────────────────────────────────
  async createRun(args: CreateRunArgs): Promise<Run> {
    const runId = `run_${uuid()}`;
    const run: Run = {
      runId,
      projectId: this.projectId,
      planId: args.planId,
      status: "queued",
      lanes: args.lanes,
      grep: args.grep,
      triggeredBy: args.triggeredBy ?? "bob",
      createdAt: now(),
      updatedAt: now(),
    };
    mkdirSync(this.path("runs", runId, "results"), { recursive: true });
    writeJson(this.path("runs", runId, "run.json"), run);
    return run;
  }

  async patchRun(runId: string, args: PatchRunArgs): Promise<Run> {
    const run = readJson(this.path("runs", runId, "run.json"));
    const updated: Run = { ...run, ...args, updatedAt: now() };
    writeJson(this.path("runs", runId, "run.json"), updated);
    return updated;
  }

  async getRun(runId: string): Promise<Run> {
    const path = this.path("runs", runId, "run.json");
    if (!existsSync(path)) {
      throw new Error(`Run ${runId} not found`);
    }
    return readJson(path);
  }

  // ── Results ─────────────────────────────────────────────────────────────
  async postResult(args: PostResultArgs): Promise<{ resultId: string; ticketId?: string }> {
    const resultId = `res_${uuid()}`;
    // Idempotency: if result for this testId+retryIndex already exists, return it
    const resultPath = this.path(
      "runs",
      args.runId,
      "results",
      `${sanitize(args.testId)}-${args.retryIndex}.json`,
    );
    if (existsSync(resultPath)) {
      const existing = readJson(resultPath);
      return { resultId: existing.resultId, ticketId: existing.ticketId };
    }
    let ticketId: string | undefined;
    let triage: TriageResult | TriagePending = { source: "pending" };
    if (args.status === "failed" || args.status === "timedOut") {
      // Run triage (heuristic is sync-fast; watsonx is async but we await it here in local mode)
      try {
        triage = await triageFailure(args);
      } catch (e) {
        logger.warn("Triage failed, using pending", { err: String(e) });
        triage = { source: "pending" };
      }
      ticketId = await this.createTicket(args, triage);
    }
    const result = {
      resultId,
      ticketId,
      triage,
      ...args,
      createdAt: now(),
    };
    writeJson(resultPath, result);
    return { resultId, ticketId };
  }

  private async createTicket(
    args: PostResultArgs,
    triage: TriageResult | TriagePending,
  ): Promise<string> {
    const ticketId = `tkt_${uuid()}`;
    const severity: Severity = triage.source !== "pending" ? triage.severity : "medium";
    const ticket: Ticket = {
      ticketId,
      title: `FAIL: ${args.title}`,
      severity,
      status: "Backlog",
      runId: args.runId,
      testId: args.testId,
      createdAt: now(),
      updatedAt: now(),
    };
    writeJson(this.path("tickets", ticketId + ".json"), ticket);
    return ticketId;
  }

  // ── Failures ────────────────────────────────────────────────────────────
  async getFailures(runId: string, severity?: Severity): Promise<FailureDetail[]> {
    const resultsDir = this.path("runs", runId, "results");
    if (!existsSync(resultsDir)) return [];
    const files = readdirSync(resultsDir).filter((f) => f.endsWith(".json"));
    const failures: FailureDetail[] = [];
    for (const file of files) {
      const result = readJson(join(resultsDir, file));
      if (result.status !== "failed" && result.status !== "timedOut") continue;
      const triageVal: TriageResult | TriagePending = result.triage ?? { source: "pending" };
      const resultSeverity: Severity = triageVal.source !== "pending" ? triageVal.severity : "medium";
      if (severity && resultSeverity !== severity) continue;
      const ticketId: string = result.ticketId ?? "";
      failures.push({
        ticketId,
        severity: resultSeverity,
        testTitle: result.title,
        specFile: result.specFile,
        line: result.line,
        errorMessage: result.error?.message ?? "",
        consoleErrors: (result.consoleErrors ?? []).map((c: { text: string }) => c.text),
        failedRequests: result.failedRequests ?? [],
        domSnippet: result.domSnippet,
        triage: triageVal,
        screenshotPath: undefined,
        screenshotUrl: result.screenshotUrl,
        traceUrl: result.traceUrl,
        videoUrl: result.videoUrl,
      });
    }
    // Sort: critical first
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    failures.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return failures;
  }

  // ── Tickets ─────────────────────────────────────────────────────────────
  async listTickets(_projectId: string, status?: TicketStatus): Promise<Ticket[]> {
    const dir = this.path("tickets");
    if (!existsSync(dir)) return [];
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const tickets: Ticket[] = [];
    for (const f of files) {
      const t = readJson(join(dir, f));
      if (!status || t.status === status) tickets.push(t);
    }
    return tickets;
  }

  async getTicket(ticketId: string): Promise<TicketDetail> {
    const path = this.path("tickets", ticketId + ".json");
    if (!existsSync(path)) throw new Error(`Ticket ${ticketId} not found`);
    const ticket = readJson(path);
    // Build failures from the associated run
    const failures = await this.getFailures(ticket.runId);
    const myFailure = failures.find((f) => f.ticketId === ticketId);
    const triage: TriageResult | TriagePending = myFailure?.triage ?? { source: "pending" };
    return { ...ticket, triage, failures: myFailure ? [myFailure] : [] };
  }

  async patchTicket(ticketId: string, args: PatchTicketArgs): Promise<Ticket> {
    const path = this.path("tickets", ticketId + ".json");
    if (!existsSync(path)) throw new Error(`Ticket ${ticketId} not found`);
    const ticket = readJson(path);
    const updated: Ticket = { ...ticket, ...args, updatedAt: now() };
    writeJson(path, updated);
    return updated;
  }

  // ── Artifacts ────────────────────────────────────────────────────────────
  async uploadArtifact(args: UploadArtifactArgs): Promise<Artifact> {
    const { readFileSync: rfs } = await import("node:fs");
    const artifactId = `art_${uuid()}`;
    const ext = args.type === "screenshot" ? ".png" : args.type === "trace" ? ".zip" : args.type === "video" ? ".webm" : ".png";
    const filename = `${artifactId}${ext}`;
    const dir = this.path("artifacts", args.runId);
    mkdirSync(dir, { recursive: true });
    const destPath = join(dir, filename);
    writeFileSync(destPath, rfs(args.filePath));
    return { artifactId, url: `file://${destPath}` };
  }

  // ── Reports ──────────────────────────────────────────────────────────────
  async createReport(runId: string): Promise<Report> {
    const reportId = `rpt_${uuid()}`;
    const run = await this.getRun(runId);
    const failures = await this.getFailures(runId);
    const html = buildHtmlReport(run, failures);
    const reportPath = this.path("reports", `${runId}.html`);
    mkdirSync(join(reportPath, ".."), { recursive: true });
    writeFileSync(reportPath, html, "utf-8");
    return { reportId, url: `file://${reportPath}`, generatedAt: now() };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sanitize(id: string): string {
  // Safe filename from arbitrary testId
  return createHash("md5").update(id).digest("hex").slice(0, 12);
}

function buildHtmlReport(run: Run, failures: FailureDetail[]): string {
  const summary = run.summary;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Kintsugi Run ${run.runId}</title>
<style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem}
.pass{color:#16a34a}.fail{color:#dc2626}table{border-collapse:collapse;width:100%}
td,th{padding:.5rem;border:1px solid #e5e7eb;text-align:left}</style>
</head><body>
<h1>Kintsugi Test Run</h1>
<p>Run ID: <code>${run.runId}</code> | Status: <strong class="${run.status === "passed" ? "pass" : "fail"}">${run.status}</strong></p>
${summary ? `<p>Total: ${summary.total} | <span class="pass">Passed: ${summary.passed}</span> | <span class="fail">Failed: ${summary.failed}</span> | Duration: ${(summary.duration / 1000).toFixed(1)}s</p>` : ""}
<h2>Failures (${failures.length})</h2>
<table><thead><tr><th>Severity</th><th>Test</th><th>Cause</th><th>File</th></tr></thead>
<tbody>
${failures
  .map(
    (f) => `<tr>
  <td>${f.severity}</td>
  <td>${escHtml(f.testTitle)}</td>
  <td>${f.triage.source !== "pending" ? escHtml(f.triage.likelyCause) : "(pending)"}</td>
  <td><code>${escHtml(f.specFile.split("/").slice(-2).join("/"))}</code></td>
</tr>`,
  )
  .join("\n")}
</tbody></table>
<footer style="margin-top:2rem;font-size:.75rem;color:#6b7280">Generated by Kintsugi · ${new Date().toISOString()}</footer>
</body></html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
