import { resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";

const InputSchema = {
  runId: z.string(),
  projectRoot: z.string().optional(),
};

export function registerGenerateReport(server: McpServer): void {
  server.tool(
    "generate_report",
    "Generates an HTML summary report for a completed run and returns its URL. In local mode, " +
      "writes the report to .kintsugi/.local/reports/{runId}.html and returns the file:// URL.",
    InputSchema,
    async (args) => {
      try {
        const projectRoot = resolve(args.projectRoot ?? ".");
        const store = await getStore(projectRoot);
        const report = await store.createReport(args.runId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ reportId: report.reportId, reportUrl: report.url }),
            },
          ],
        };
      } catch (err) {
        logger.error("generate_report failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}
