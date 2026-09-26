import { createServer, startServer } from "./server.js";
import { logger } from "./lib/logger.js";
import { registerPing } from "./tools/ping.js";
import { registerInitProject } from "./tools/init-project.js";
import { registerRunTests } from "./tools/run-tests.js";
import { registerGetRunStatus } from "./tools/get-run-status.js";
import { registerAnalyzeApp } from "./tools/analyze-app.js";
import { registerSaveTestPlan } from "./tools/save-test-plan.js";
import { registerGetFailures } from "./tools/get-failures.js";
import { registerRerunTest } from "./tools/rerun-test.js";
import { registerListTickets, registerGetTicket, registerUpdateTicket } from "./tools/tickets.js";
import { registerVisualCheck } from "./tools/visual-check.js";
import { registerA11yCheck } from "./tools/a11y-check.js";
import { registerGenerateReport } from "./tools/generate-report.js";
import { runRegistry } from "./runner/run-registry.js";

async function main(): Promise<void> {
  const server = createServer();
  // Register tools
  registerPing(server);
  registerInitProject(server);
  registerAnalyzeApp(server);
  registerSaveTestPlan(server);
  registerRunTests(server);
  registerGetRunStatus(server);
  registerGetFailures(server);
  registerRerunTest(server);
  registerListTickets(server);
  registerGetTicket(server);
  registerUpdateTicket(server);
  // Stretch tools
  registerVisualCheck(server);
  registerA11yCheck(server);
  registerGenerateReport(server);

  // Graceful shutdown: kill any in-flight Playwright children and clean up NDJSON files
  const shutdown = (): void => {
    logger.info("shutting down — killing in-flight runs");
    for (const [runId, state] of runRegistry.all()) {
      try {
        state.child.kill();
      } catch {
        // best-effort
      }
      logger.debug("killed run child", { runId });
    }
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Starts the stdio MCP transport; never resolves while the process is alive
  await startServer(server);
}

main().catch((err) => {
  logger.error("Fatal startup error", { err: String(err) });
  process.exit(1);
});
