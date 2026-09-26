import { z } from "zod";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";

const InputSchema = {
  runId: z.string(),
  projectRoot: z.string().optional().describe("Required in local mode to locate the store."),
  severity: z
    .enum(["critical", "high", "medium", "low"])
    .optional()
    .describe("Filter by severity. Omit to return all failures."),
};

export function registerGetFailures(server: McpServer): void {
  server.tool(
    "get_failures",
    "Returns per-failure details for a completed run: error message, console errors, failed HTTP " +
      "requests, DOM snippet, screenshot path, and triage result (severity, likelyCause, " +
      "suspectedFiles, confidence, source). Triage may show source: 'pending' if watsonx is still " +
      "running — call get_failures again in a few seconds. Filter by severity to prioritise " +
      "critical/high first.",
    InputSchema,
    async (args) => {
      try {
        const projectRoot = resolve(args.projectRoot ?? ".");
        const store = await getStore(projectRoot);
        const failures = await store.getFailures(args.runId, args.severity);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ failures, total: failures.length, runId: args.runId }),
            },
          ],
        };
      } catch (err) {
        logger.error("get_failures failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}
