import { resolve, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../lib/config.js";
import { assertAllowedHost } from "../lib/security.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

// Use require() for optional deps (pngjs, pixelmatch) to avoid compile-time resolution
const require = createRequire(import.meta.url);

const InputSchema = {
  projectRoot: z.string(),
  route: z.string().describe("Route path, e.g. '/dashboard'. Appended to baseUrl."),
  viewport: z
    .object({ width: z.number().int(), height: z.number().int() })
    .optional()
    .describe("Viewport size. Defaults to 1280x720."),
  threshold: z
    .number()
    .min(0)
    .max(100)
    .default(0.1)
    .describe("Mismatch % threshold to fail. Default 0.1%."),
};

interface VisualCheckArgs {
  projectRoot: string;
  route: string;
  viewport?: { width: number; height: number };
  threshold: number;
}

export function registerVisualCheck(server: McpServer): void {
  server.tool(
    "visual_check",
    "Captures a screenshot of the given route and compares it to the stored baseline in " +
      ".kintsugi/baselines/{route-slug}.png using pixel-level diff (pixelmatch). Returns mismatch " +
      "percentage and saves the diff image. On first run (no baseline exists), saves the screenshot " +
      "as the new baseline and returns baselineCreated: true.",
    InputSchema,
    async (args) => {
      try {
        const result = await visualCheck(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        logger.error("visual_check failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

async function visualCheck(args: VisualCheckArgs) {
  const projectRoot = resolve(args.projectRoot);
  const config = readConfig(projectRoot);
  const url = config.baseUrl.replace(/\/$/, "") + args.route;
  assertAllowedHost(config, url);
  const viewport = args.viewport ?? { width: 1280, height: 720 };
  const slug = args.route.replace(/\//g, "_").replace(/[^a-z0-9_\-]/gi, "") || "root";
  const baselinesDir = join(projectRoot, ".kintsugi", "baselines");
  mkdirSync(baselinesDir, { recursive: true });
  const baselinePath = join(baselinesDir, `${slug}.png`);
  const diffPath = join(baselinesDir, `${slug}.diff.png`);
  // Dynamic import playwright (@playwright/test is CJS — chromium may be on .default)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pwMod: any = await import(`${projectRoot}/node_modules/@playwright/test/index.js`).catch(() =>
    import(`${projectRoot}/node_modules/playwright/index.js`),
  );
  const chromium = pwMod.chromium ?? pwMod.default?.chromium;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  const screenshotBuffer = await page.screenshot({ fullPage: false });
  await page.close();
  await browser.close();
  if (!existsSync(baselinePath)) {
    writeFileSync(baselinePath, screenshotBuffer);
    return { baselineCreated: true, passed: true, threshold: args.threshold };
  }
  // Compare with baseline using require() for optional deps (pngjs, pixelmatch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PNG: any, pixelmatch: any;
  try {
    ({ PNG } = require("pngjs"));
  } catch {
    throw new Error("pngjs not installed. Run: npm install pngjs");
  }
  try {
    pixelmatch = require("pixelmatch").default ?? require("pixelmatch");
  } catch {
    throw new Error("pixelmatch not installed. Run: npm install pixelmatch");
  }
  const baselinePng = PNG.sync.read(readFileSync(baselinePath));
  const currentPng = PNG.sync.read(screenshotBuffer);
  const { width, height } = baselinePng;
  const diffPng = new PNG({ width, height });
  const diffPixels = pixelmatch(baselinePng.data, currentPng.data, diffPng.data, width, height, {
    threshold: 0.1,
  });
  const mismatchPercent = (diffPixels / (width * height)) * 100;
  const passed = mismatchPercent <= args.threshold;
  if (!passed) {
    writeFileSync(diffPath, PNG.sync.write(diffPng));
  }
  return {
    baselineCreated: false,
    mismatchPercent: Math.round(mismatchPercent * 100) / 100,
    diffImagePath: passed ? undefined : diffPath,
    passed,
    threshold: args.threshold,
  };
}
