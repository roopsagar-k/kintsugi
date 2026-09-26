import type { Severity } from "../api/types.js";
import type { TriageInput, TriageResult } from "./types.js";

interface HeuristicRule {
  match: (i: TriageInput) => boolean;
  severity: Severity;
  likelyCause: string;
}

const RULES: HeuristicRule[] = [
  {
    match: (i) => {
      const msg = (i.error?.message ?? "").toLowerCase();
      const title = i.title.toLowerCase();
      return (
        msg.includes("401") ||
        msg.includes("403") ||
        msg.includes("forbidden") ||
        msg.includes("unauthorized") ||
        title.includes("auth") ||
        title.includes("login") ||
        title.includes("sign in") ||
        title.includes("logout")
      );
    },
    severity: "critical",
    likelyCause: "Authentication or access-control failure",
  },
  {
    match: (i) => {
      const has5xx = i.failedRequests.some((r) => r.status >= 500 && r.status < 600);
      const hasUncaught = i.consoleErrors.some((c) => c.text.toLowerCase().includes("uncaught"));
      return has5xx || hasUncaught;
    },
    severity: "high",
    likelyCause: "Server-side error or unhandled exception",
  },
  {
    match: (i) => {
      const msg = (i.error?.message ?? "").toLowerCase();
      return (
        msg.includes("assert") ||
        msg.includes("expect") ||
        msg.includes("toequal") ||
        msg.includes("tobe") ||
        msg.includes("validation") ||
        msg.includes("expected") ||
        msg.includes("received")
      );
    },
    severity: "medium",
    likelyCause: "Assertion or data-validation failure",
  },
  {
    match: (i) => {
      const title = i.title.toLowerCase();
      return (
        title.includes("visual") ||
        title.includes("style") ||
        title.includes("layout") ||
        title.includes("a11y") ||
        title.includes("accessibility")
      );
    },
    severity: "low",
    likelyCause: "Visual or accessibility regression",
  },
];

/**
 * Heuristic triage — synchronous, no external calls.
 * Applies rule table, extracts suspected files from stack trace and spec path.
 */
export function heuristicTriage(input: TriageInput): TriageResult {
  // Find first matching rule
  const rule = RULES.find((r) => r.match(input));
  const severity: Severity = rule?.severity ?? "medium";
  const likelyCause =
    rule?.likelyCause ?? "Unknown failure — check error message and stack trace";
  const suspectedFiles = extractSuspectedFiles(input);
  return {
    severity,
    likelyCause,
    suspectedFiles,
    confidence: 0.4,
    source: "heuristic",
  };
}

function extractSuspectedFiles(input: TriageInput): string[] {
  const files = new Set<string>();
  // 1. Parse stack trace for source file paths (exclude node_modules)
  const stack = input.error?.stack ?? "";
  const stackFileRegex = /([A-Za-z0-9_\-./]+\.(ts|tsx|js|jsx)):\d+/g;
  let m: RegExpExecArray | null;
  while ((m = stackFileRegex.exec(stack)) !== null) {
    const file = m[1] ?? "";
    if (!file.includes("node_modules") && !file.includes("playwright")) {
      files.add(file);
    }
  }
  // 2. Derive route-based suspected files from spec file path
  // e.g. tests/auth/login.spec.ts → app/auth/**, app/api/auth/**
  const specMatch = /tests\/([^/]+)\//.exec(input.specFile);
  if (specMatch?.[1]) {
    const lane = specMatch[1];
    files.add(`app/${lane}/**`);
    files.add(`app/api/${lane}/**`);
  }
  return [...files].slice(0, 10); // cap at 10
}
