import { resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../lib/config.js";
import { assertAllowedHost } from "../lib/security.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const InputSchema = {
  projectRoot: z.string(),
  route: z.string().describe("Route path, e.g. '/dashboard'. Appended to baseUrl."),
};

interface A11yCheckArgs {
  projectRoot: string;
  route: string;
}

export function registerA11yCheck(server: McpServer): void {
  server.tool(
    "a11y_check",
    "Runs axe-core accessibility audit on the given route. Returns up to 20 violations: rule ID, " +
      "impact (critical/serious/moderate/minor), element description, number of affected nodes, " +
      "and help URL. Returns total violations and passed: true if no critical/serious issues.",
    InputSchema,
    async (args) => {
      try {
        const result = await a11yCheck(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        logger.error("a11y_check failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

async function a11yCheck(args: A11yCheckArgs) {
  const projectRoot = resolve(args.projectRoot);
  const config = readConfig(projectRoot);
  const url = config.baseUrl.replace(/\/$/, "") + args.route;
  assertAllowedHost(config, url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pwMod: any = await import(`${projectRoot}/node_modules/@playwright/test/index.js`).catch(() =>
    import(`${projectRoot}/node_modules/playwright/index.js`),
  );
  const chromium = pwMod.chromium ?? pwMod.default?.chromium;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { checkA11y, injectAxe }: any = await import(
    `${projectRoot}/node_modules/@axe-core/playwright/index.js`
  ).catch(() => {
    throw new Error("@axe-core/playwright not installed. Run: npm install @axe-core/playwright");
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await injectAxe(page);
  const results = await checkA11y(page, undefined, { detailedReport: true }).catch(() => ({
    violations: [],
  }));
  await page.close();
  await browser.close();
  const violations = (results.violations ?? [])
    .slice(0, 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((v: any) => ({
      id: String(v.id ?? ""),
      impact: String(v.impact ?? ""),
      description: String(v.description ?? "").slice(0, 200),
      nodes: Array.isArray(v.nodes) ? v.nodes.length : 0,
      helpUrl: String(v.helpUrl ?? ""),
    }));
  const hasCritical = violations.some(
    (v: { impact: string }) => v.impact === "critical" || v.impact === "serious",
  );
  return {
    violations,
    total: violations.length,
    passed: !hasCritical,
    url,
  };
}
