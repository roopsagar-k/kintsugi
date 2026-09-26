import { logger } from "../lib/logger.js";
import type { Severity } from "../api/types.js";
import type { TriageInput, TriageResult } from "./types.js";

let iamCache: { token: string; expiration: number } | null = null;

async function getIamToken(apiKey: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (iamCache && iamCache.expiration - nowSec > 60) {
    return iamCache.token;
  }
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`IAM token fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expiration: number };
  iamCache = { token: data.access_token, expiration: data.expiration };
  return iamCache.token;
}

function buildPrompt(input: TriageInput): string {
  const errorMsg = (input.error?.message ?? "no error message").slice(0, 300);
  const stack = (input.error?.stack ?? "").slice(0, 500);
  const consoleErrs = input.consoleErrors
    .slice(0, 3)
    .map((c) => c.text)
    .join("; ");
  const failedReqs = input.failedRequests
    .slice(0, 3)
    .map((r) => `${r.method} ${r.url} → ${r.status}`)
    .join("; ");
  return `You are a QA triage assistant. A Playwright E2E test has failed. Analyse the failure and respond with ONLY valid JSON — no markdown, no explanation.

Test title: ${input.title}
Error message: ${errorMsg}
Stack trace: ${stack}
Console errors: ${consoleErrs || "none"}
Failed HTTP requests: ${failedReqs || "none"}
Spec file: ${input.specFile}

Respond with exactly this JSON structure:
{
  "severity": "critical" | "high" | "medium" | "low",
  "likelyCause": "one sentence describing the root cause",
  "suspectedFiles": ["relative/path/to/file.ts"],
  "confidence": 0.0 to 1.0
}

Severity guide:
- critical: auth/access failures (401, 403, forbidden)
- high: server errors (5xx), uncaught exceptions
- medium: assertion failures, validation errors
- low: visual regressions, a11y issues`;
}

/**
 * Calls IBM watsonx.ai for AI-powered triage.
 * Throws on any failure so the caller falls back to heuristic.
 * One retry on 429 or 5xx.
 */
export async function watsonxTriage(input: TriageInput): Promise<TriageResult> {
  const apiKey = process.env["KINTSUGI_WATSONX_API_KEY"];
  const projectId = process.env["KINTSUGI_WATSONX_PROJECT_ID"];
  const url = process.env["KINTSUGI_WATSONX_URL"];
  const model = process.env["KINTSUGI_WATSONX_MODEL"];
  if (!apiKey || !projectId || !url || !model) {
    throw new Error("watsonx env not fully configured");
  }
  const iamToken = await getIamToken(apiKey);
  const prompt = buildPrompt(input);
  const callOnce = async (): Promise<TriageResult> => {
    const res = await fetch(`${url}/ml/v1/text/generation?version=2023-05-29`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${iamToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: model,
        project_id: projectId,
        input: prompt,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 300,
          stop_sequences: ["\n\n"],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`watsonx ${res.status} — retry`);
      }
      throw new Error(`watsonx ${res.status} — permanent`);
    }
    const data = (await res.json()) as { results: Array<{ generated_text?: string }> };
    const text = data.results[0]?.generated_text ?? "";
    // Extract JSON from the response (model may add extra text)
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (!jsonMatch) throw new Error("watsonx response contained no JSON");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = JSON.parse(jsonMatch[0]);
    // Validate the shape
    const validSeverities = ["critical", "high", "medium", "low"];
    if (!validSeverities.includes(parsed.severity)) {
      throw new Error(`Invalid severity: ${parsed.severity}`);
    }
    return {
      severity: parsed.severity as Severity,
      likelyCause: String(parsed.likelyCause).slice(0, 200),
      suspectedFiles: Array.isArray(parsed.suspectedFiles)
        ? parsed.suspectedFiles.slice(0, 10).map(String)
        : [],
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence))),
      source: "watsonx",
    };
  };
  try {
    return await callOnce();
  } catch (err) {
    const msg = String(err);
    if (msg.includes("retry")) {
      logger.warn("watsonx transient error, retrying in 1s", { err: msg });
      await new Promise((r) => setTimeout(r, 1000));
      return callOnce();
    }
    throw err;
  }
}
