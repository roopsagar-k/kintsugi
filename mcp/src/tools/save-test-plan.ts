import { resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";

const InputSchema = {
  projectRoot: z.string(),
  source: z.string().describe("How this plan was generated, e.g. 'bob-qa-v1'"),
  lanes: z.array(
    z.object({
      name: z.string(),
      cases: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          steps: z.array(z.string()),
          expected: z.string(),
        }),
      ),
    }),
  ),
};

export function registerSaveTestPlan(server: McpServer): void {
  server.tool(
    "save_test_plan",
    "Saves a structured test plan (lanes with test cases) to the Kintsugi store and returns a " +
      "planId. Call this after analyze_app, before run_tests. Pass the returned planId to " +
      "run_tests to link results to this plan and enable dashboard tracking.",
    InputSchema,
    async (args) => {
      try {
        const projectRoot = resolve(args.projectRoot);
        const store = await getStore(projectRoot);
        let projectId = "local";
        try {
          const auth = await store.verifyKey();
          projectId = auth.projectId;
        } catch {
          projectId = "local";
        }
        const plan = await store.createPlan({
          projectId,
          source: args.source,
          lanes: args.lanes,
        });
        const totalCases = args.lanes.reduce((sum, l) => sum + l.cases.length, 0);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                planId: plan.planId,
                dashboardUrl: plan.dashboardUrl,
                totalCases,
              }),
            },
          ],
        };
      } catch (err) {
        logger.error("save_test_plan failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}
