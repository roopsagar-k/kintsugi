import { join, resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../lib/config.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";
import { spawnPlaywright } from "../runner/spawn-playwright.js";
import { startResultCollector } from "../runner/result-collector.js";
import { runRegistry, type RunState } from "../runner/run-registry.js";
import type { RunSummary } from "../api/types.js";

const InputSchema = {
  projectRoot: z.string().describe("Absolute path to the project being tested"),
  lanes: z
    .array(z.string())
    .optional()
    .describe(
      "Lane names to run, e.g. ['auth', 'checkout']. Maps to tests/auth/, tests/checkout/. Omit to run all lanes.",
    ),
  grep: z.string().optional().describe("Playwright --grep pattern for title-based filtering."),
  planId: z.string().optional().describe("Links this run to a previously saved test plan."),
};

interface RunTestsArgs {
  projectRoot: string;
  lanes?: string[];
  grep?: string;
  planId?: string;
}

export function registerRunTests(server: McpServer): void {
  server.tool(
    "run_tests",
    "Runs Playwright E2E tests from .kintsugi/tests/ against the app. Lane names map to " +
      "subdirectory paths (tests/auth/ etc.) — specs must live under .kintsugi/tests/{lane}/. " +
      "Blocks up to 90s; if tests finish, returns full summary with ticketIds. If still running, " +
      "returns { status: 'running', nextAction } — call get_run_status immediately, it also waits " +
      "server-side. Always call get_failures(runId) after a run with failures to get watsonx triage " +
      "and fix hints.",
    InputSchema,
    async (args) => {
      try {
        const result = await runTests(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        logger.error("run_tests failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

async function runTests(args: RunTestsArgs) {
  const projectRoot = resolve(args.projectRoot);
  const config = readConfig(projectRoot);
  // Prevent concurrent runs on same project
  const existing = runRegistry.findActiveByProject(projectRoot);
  if (existing) {
    // Find the runId for it
    for (const [runId, state] of runRegistry.all()) {
      if (state.projectRoot === projectRoot) {
        return {
          status: "error",
          runId,
          message: `A run is already in progress. Call get_run_status(${runId}).`,
        };
      }
    }
  }
  const store = await getStore(projectRoot);
  // Verify key on first use (cloud mode)
  let projectId = "local";
  try {
    const auth = await store.verifyKey();
    projectId = auth.projectId;
  } catch {
    // local mode returns "local"
    projectId = "local";
  }
  const run = await store.createRun({
    projectId,
    planId: args.planId,
    lanes: args.lanes,
    grep: args.grep,
    triggeredBy: "bob",
  });
  const runId = run.runId;
  // NDJSON path inside the project, gitignored
  const ndjsonPath = join(projectRoot, ".kintsugi", ".runs", `${runId}.ndjson`);
  // Build Playwright args
  const playwrightArgs = ["test", "--config", ".kintsugi/playwright.config.ts"];
  if (args.lanes && args.lanes.length > 0) {
    // Positional directory args: tests/auth/, tests/checkout/
    for (const lane of args.lanes) {
      playwrightArgs.push(`tests/${lane}/`);
    }
  }
  if (args.grep) {
    playwrightArgs.push("--grep", args.grep);
  }
  // Child env — API key via env, never argv
  const childEnv: Record<string, string> = {
    KINTSUGI_RUN_ID: runId,
    KINTSUGI_NDJSON_PATH: ndjsonPath,
    KINTSUGI_PROJECT_ROOT: projectRoot,
    KINTSUGI_MODE: process.env["KINTSUGI_MODE"] ?? "local",
    KINTSUGI_API_URL: process.env["KINTSUGI_API_URL"] ?? "",
    KINTSUGI_API_KEY: process.env["KINTSUGI_API_KEY"] ?? "",
    KINTSUGI_WATSONX_API_KEY: process.env["KINTSUGI_WATSONX_API_KEY"] ?? "",
    KINTSUGI_WATSONX_PROJECT_ID: process.env["KINTSUGI_WATSONX_PROJECT_ID"] ?? "",
    KINTSUGI_WATSONX_URL: process.env["KINTSUGI_WATSONX_URL"] ?? "",
    KINTSUGI_WATSONX_MODEL: process.env["KINTSUGI_WATSONX_MODEL"] ?? "",
  };
  // Completion promise — resolved by result-collector when "end" NDJSON line arrives
  let resolveCompletion!: (summary: RunSummary) => void;
  let rejectCompletion!: (err: Error) => void;
  const completionPromise = new Promise<RunSummary>((res, rej) => {
    resolveCompletion = res;
    rejectCompletion = rej;
  });
  const child = spawnPlaywright({ projectRoot, args: playwrightArgs, env: childEnv });
  const state: RunState = {
    child,
    projectRoot,
    ndjsonPath,
    progress: { done: 0, total: 0, passed: 0, failed: 0 },
    completionPromise,
    resolve: resolveCompletion,
    reject: rejectCompletion,
  };
  runRegistry.register(runId, state);
  // Patch run to "running"
  await store.patchRun(runId, { status: "running" }).catch(() => {});
  // Start collector — tails NDJSON, posts results, resolves completionPromise on end
  startResultCollector(ndjsonPath, runId, state, store);
  // Clean up registry when child exits
  child.on("exit", () => {
    setTimeout(() => runRegistry.delete(runId), 5000);
  });
  // Wait up to 90s
  const summary = await Promise.race([completionPromise, sleep(90_000).then(() => null)]);
  if (summary) {
    return {
      status: "done",
      runId,
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      duration: summary.duration,
      ticketIds: summary.ticketIds,
      dashboardUrl: config.baseUrl ? undefined : undefined,
      nextAction:
        summary.failed > 0
          ? `Call get_failures("${runId}") to see failure details and watsonx triage.`
          : "All tests passed! Optionally call generate_report to get a summary report.",
    };
  }
  // Still running after 90s
  const progress = state.progress;
  return {
    status: "running",
    runId,
    done: progress.done,
    total: progress.total,
    passed: progress.passed,
    failed: progress.failed,
    nextAction: `Run still in progress (${progress.done}/${progress.total} done). Call get_run_status("${runId}") immediately — it waits server-side.`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
