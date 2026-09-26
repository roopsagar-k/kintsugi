import { resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";
import { runRegistry } from "../runner/run-registry.js";

const InputSchema = {
  runId: z.string().describe("Run ID returned by run_tests"),
  waitMs: z
    .number()
    .int()
    .min(1000)
    .max(90000)
    .default(60000)
    .describe("Server-side wait ceiling in ms. Default 60000. Re-call immediately when status is running."),
};

interface GetRunStatusArgs {
  runId: string;
  waitMs: number;
}

export function registerGetRunStatus(server: McpServer): void {
  server.tool(
    "get_run_status",
    "Waits server-side until the test run completes or waitMs elapses, then returns the current " +
      "status. If done, returns full summary with ticketIds and nextAction. If still running at " +
      "waitMs, returns { status: 'running', done, total, nextAction } — call this tool again " +
      "immediately, no delay needed as it blocks server-side. Use nextAction to guide the next step.",
    InputSchema,
    async (args) => {
      try {
        const result = await getRunStatus(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        logger.error("get_run_status failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

async function getRunStatus(args: GetRunStatusArgs) {
  const { runId, waitMs } = args;
  // Fast path: run is live in registry
  const state = runRegistry.get(runId);
  if (state) {
    const summary = await Promise.race([state.completionPromise, sleep(waitMs).then(() => null)]);
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
        nextAction:
          summary.failed > 0
            ? `Call get_failures("${runId}") to see failure details and watsonx triage.`
            : "All tests passed!",
      };
    }
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
  // Fallback: check store (run finished before server restarted, or registry expired)
  try {
    // We need a projectRoot to get the store — try a best-effort with process.cwd()
    // In practice, Bob always has the projectRoot, so this is a safety net
    const store = await getStore(resolve("."));
    const run = await store.getRun(runId);
    if (run.summary) {
      return {
        status: "done",
        runId,
        total: run.summary.total,
        passed: run.summary.passed,
        failed: run.summary.failed,
        skipped: run.summary.skipped,
        duration: run.summary.duration,
        ticketIds: run.summary.ticketIds,
        nextAction:
          run.summary.failed > 0
            ? `Call get_failures("${runId}") to see failure details.`
            : "All tests passed!",
      };
    }
  } catch {
    // store unavailable
  }
  return {
    status: "error",
    runId,
    message: "Run not found in registry or store. The MCP server may have restarted. Try run_tests again.",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
