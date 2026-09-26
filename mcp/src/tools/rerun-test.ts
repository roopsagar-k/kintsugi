import { join, resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../lib/config.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";
import { spawnPlaywright } from "../runner/spawn-playwright.js";
import { startResultCollector } from "../runner/result-collector.js";
import { type RunState } from "../runner/run-registry.js";
import type { Run, RunSummary } from "../api/types.js";

const InputSchema = {
  projectRoot: z.string(),
  ticketId: z.string().optional(),
  testId: z.string().optional(),
};

interface RerunTestArgs {
  projectRoot: string;
  ticketId?: string;
  testId?: string;
}

export function registerRerunTest(server: McpServer): void {
  server.tool(
    "rerun_test",
    "Re-runs a single test by ticketId or testId using --grep on the test title. Returns " +
      "pass/fail and fresh evidence. If the test passes, moves the ticket to Done. Use after " +
      "applying a fix to confirm it resolved the failure.",
    InputSchema,
    async (args) => {
      if (!args.ticketId && !args.testId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "invalid_input", message: "Provide ticketId or testId" }),
            },
          ],
        };
      }
      try {
        const result = await rerunTest(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        logger.error("rerun_test failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

async function rerunTest(args: RerunTestArgs) {
  const projectRoot = resolve(args.projectRoot);
  // Reads (and validates) config so a misconfigured project fails fast.
  readConfig(projectRoot);
  const store = await getStore(projectRoot);
  let testTitle: string;
  const ticketId = args.ticketId;
  if (ticketId) {
    const ticket = await store.getTicket(ticketId);
    testTitle = ticket.failures[0]?.testTitle ?? ticket.title.replace(/^FAIL: /, "");
  } else {
    // testId provided — get title from store
    const run = await store.getRun(args.testId ?? ""); // best-effort
    testTitle = args.testId ?? "";
    void run; // run lookup may fail — use testId as grep pattern
  }
  const runId = `rerun_${crypto.randomUUID()}`;
  const ndjsonPath = join(projectRoot, ".kintsugi", ".runs", `${runId}.ndjson`);
  const playwrightArgs = ["test", "--config", ".kintsugi/playwright.config.ts", "--grep", testTitle];
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
  let resolveCompletion!: (summary: RunSummary) => void;
  let rejectCompletion!: (err: Error) => void;
  const completionPromise = new Promise<RunSummary>((res, rej) => {
    resolveCompletion = res;
    rejectCompletion = rej;
  });
  const child = spawnPlaywright({ projectRoot, args: playwrightArgs, env: childEnv });
  // Minimal run record for the rerun
  const rerunRun = await store
    .createRun({ projectId: "local", triggeredBy: "bob" })
    .catch(
      (): Run => ({
        runId,
        status: "queued",
        projectId: "local",
        triggeredBy: "bob",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
  const state: RunState = {
    child,
    projectRoot,
    ndjsonPath,
    progress: { done: 0, total: 0, passed: 0, failed: 0 },
    completionPromise,
    resolve: resolveCompletion,
    reject: rejectCompletion,
  };
  startResultCollector(ndjsonPath, rerunRun.runId, state, store);
  // Single test — 30s hard timeout
  const summary = await Promise.race([
    completionPromise,
    sleep(30_000).then(
      (): RunSummary => ({ total: 0, passed: 0, failed: 1, skipped: 0, duration: 30000, ticketIds: [] }),
    ),
  ]);
  const passed = summary.passed > 0 && summary.failed === 0;
  if (passed && ticketId) {
    await store.patchTicket(ticketId, { status: "Done" }).catch(() => {});
  }
  return {
    passed,
    ticketId,
    ticketStatus: passed ? "Done" : undefined,
    errorMessage: passed ? undefined : "Test still failing after rerun.",
    screenshotPath: undefined,
    duration: summary.duration,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
