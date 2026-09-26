/**
 * lib/triage.ts
 *
 * Analyses a failed test result and returns structured triage metadata.
 * Primary: IBM watsonx.ai (Granite). Fallback: deterministic heuristics.
 */

import type { Result, Triage, Severity } from "./types"

// ── watsonx.ai client (lazy-initialised) ──────────────────────────────────────

type WatsonXAI = import("@ibm-cloud/watsonx-ai").WatsonXAI

let wxClient: WatsonXAI | null = null

async function getWatsonxClient(): Promise<WatsonXAI | null> {
  const url = process.env.WATSONX_URL
  const apikey = process.env.WATSONX_APIKEY
  if (!url || !apikey) return null

  if (wxClient) return wxClient

  const { WatsonXAI } = await import("@ibm-cloud/watsonx-ai")
  const { IamAuthenticator } = await import("ibm-cloud-sdk-core")

  wxClient = WatsonXAI.newInstance({
    authenticator: new IamAuthenticator({ apikey }),
    serviceUrl: url,
    version: "2024-05-31",
  })
  return wxClient
}

// ── watsonx prompt ─────────────────────────────────────────────────────────────

function buildPrompt(result: Result): string {
  const errMsg = result.error?.message ?? "(no error message)"
  const stack = result.error?.stack ? result.error.stack.slice(0, 600) : ""
  const consoleSummary = result.console
    .filter(m => m.type === "error" || m.type === "warning")
    .slice(0, 5)
    .map(m => `[${m.type}] ${m.text}`)
    .join("\n")
  const networkFails = result.network
    .filter(n => n.status >= 400)
    .slice(0, 5)
    .map(n => `${n.method} ${n.url} → ${n.status}`)
    .join("\n")

  return `You are a QA triage assistant. Analyse the following Playwright test failure and return ONLY valid JSON — no prose before or after.

Test title: ${result.title}
Spec file: ${result.specFile}:${result.line}
Status: ${result.status}
Error: ${errMsg}
${stack ? `Stack:\n${stack}\n` : ""}${consoleSummary ? `Console:\n${consoleSummary}\n` : ""}${networkFails ? `Failed requests:\n${networkFails}\n` : ""}
Respond with this JSON object (no markdown fences):
{
  "cause": "<one-sentence root cause>",
  "area": "<ui | api | auth | database | network | visual | a11y | performance | unknown>",
  "severity": "<critical | high | medium | low>",
  "suspectedFiles": ["<path>", ...],
  "confidence": <0.0-1.0>
}

Severity guide: critical=auth/payments/data loss, high=5xx/unhandled, medium=assertion/functional, low=visual/a11y.`
}

// ── watsonx call ───────────────────────────────────────────────────────────────

async function triageWithWatsonx(result: Result): Promise<Triage | null> {
  const client = await getWatsonxClient()
  if (!client) return null

  const projectId = process.env.WATSONX_PROJECT_ID
  const modelId = process.env.WATSONX_MODEL ?? "ibm/granite-4-h-small"
  if (!projectId) return null

  try {
    // Modern models (Granite 4, Llama 4, …) are chat models — use the chat API,
    // not the legacy text/generation completion endpoint (which returns garbage).
    const res = await client.textChat({
      modelId,
      projectId,
      messages: [{ role: "user", content: buildPrompt(result) }],
      maxTokens: 400,
      temperature: 0,
    })

    const raw = res.result.choices?.[0]?.message?.content?.trim() ?? ""
    // Strip accidental markdown fences
    const json = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
    const parsed = JSON.parse(json) as {
      cause?: string
      area?: string
      severity?: Severity
      suspectedFiles?: string[]
      confidence?: number
    }

    return {
      cause: parsed.cause ?? "Unknown",
      area: parsed.area ?? "unknown",
      severity: parseSeverity(parsed.severity) ?? heuristicSeverity(result),
      suspectedFiles: parsed.suspectedFiles,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
      source: "watsonx",
    }
  } catch {
    return null
  }
}

// ── Heuristic fallback ─────────────────────────────────────────────────────────

function heuristicSeverity(result: Result): Severity {
  const msg = (result.error?.message ?? "").toLowerCase()
  const stack = (result.error?.stack ?? "").toLowerCase()
  const combined = msg + " " + stack

  // Auth / payment critical signals
  if (/401|403|unauthorized|forbidden|payment|billing/.test(combined)) return "critical"
  // Server error / unhandled
  if (/5[0-9]{2}|internal server error|uncaught|unhandled/.test(combined)) return "high"
  // Visual / a11y
  if (result.diffPct !== undefined || /a11y|accessibility|aria|contrast/.test(combined)) return "low"
  // Default assertion
  return "medium"
}

function heuristicArea(result: Result): string {
  const msg = (result.error?.message ?? "").toLowerCase()
  if (/401|403|unauthorized|forbidden|auth|login/.test(msg)) return "auth"
  if (/5[0-9]{2}|network|fetch|timeout/.test(msg)) return "api"
  if (/a11y|accessibility|aria/.test(msg)) return "a11y"
  if (result.diffPct !== undefined) return "visual"
  return "ui"
}

function heuristicTriage(result: Result): Triage {
  return {
    cause: result.error?.message ?? result.status,
    area: heuristicArea(result),
    severity: heuristicSeverity(result),
    suspectedFiles: result.specFile ? [result.specFile] : undefined,
    confidence: 0.5,
    source: "heuristic",
  }
}

function parseSeverity(v: unknown): Severity | null {
  if (v === "critical" || v === "high" || v === "medium" || v === "low") return v
  return null
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns a Triage object for a failed/timedOut test result.
 * Tries watsonx.ai first; falls back to deterministic heuristics.
 */
export async function triageFailure(result: Result): Promise<Triage> {
  const wx = await triageWithWatsonx(result)
  if (wx) return wx
  return heuristicTriage(result)
}
