import { resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readConfig } from "../lib/config.js";
import { assertAllowedHost } from "../lib/security.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const InputSchema = {
  projectRoot: z.string(),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Max pages to crawl. Keep ≤10 to stay within context limits."),
};

interface AnalyzeAppArgs {
  projectRoot: string;
  maxPages: number;
}

interface RouteEntry {
  url: string;
  title: string;
  forms: unknown;
  buttons: string[];
  links: string[];
  consoleErrors: string[];
}

export function registerAnalyzeApp(server: McpServer): void {
  server.tool(
    "analyze_app",
    "Crawls the running application with a headless Playwright browser starting from the baseUrl " +
      "in .kintsugi/config.json. Returns a compact route map: URLs visited, page titles, forms " +
      "(field names, types, required), buttons, same-origin links, and console errors seen during " +
      "crawl. Use this before writing test specs to understand the app structure. Keep maxPages ≤10.",
    InputSchema,
    async (args) => {
      try {
        const result = await analyzeApp(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        logger.error("analyze_app failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

async function analyzeApp(args: AnalyzeAppArgs) {
  const projectRoot = resolve(args.projectRoot);
  const config = readConfig(projectRoot);
  // Dynamic import of Playwright from the target project. @playwright/test is CJS,
  // so under ESM its named exports may live on `.default` — check both shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pwMod: any = await import(
    /* @vite-ignore */ `${projectRoot}/node_modules/@playwright/test/index.js`
  ).catch(() => import(/* @vite-ignore */ `${projectRoot}/node_modules/playwright/index.js`));
  const chromium = pwMod.chromium ?? pwMod.default?.chromium;
  if (!chromium) {
    throw new Error("Could not load Playwright chromium from the project's node_modules.");
  }
  const browser = await chromium.launch({ headless: true });
  const routeMap: RouteEntry[] = [];
  const visited = new Set<string>();
  const queue: string[] = [config.baseUrl];
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page.on("console", (...msgArgs: any[]) => {
    const msg = msgArgs[0];
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });
  const origin = new URL(config.baseUrl).origin;
  while (queue.length > 0 && visited.size < args.maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    try {
      assertAllowedHost(config, url);
    } catch {
      continue;
    }
    visited.add(url);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    } catch {
      continue;
    }
    const pageConsoleErrors = [...consoleErrors];
    consoleErrors.length = 0;
    const title = await page.title().catch(() => "");
    // Extract forms, buttons, links via evaluate — runs in browser context.
    // We pass the script as a string to avoid TypeScript DOM type errors in Node context.
    const evalScript = `(function() {
      var forms = [];
      document.querySelectorAll("form").forEach(function(form) {
        var fields = [];
        form.querySelectorAll("input,select,textarea").forEach(function(inp) {
          fields.push({ name: inp.name||inp.id||"", type: inp.type||inp.tagName.toLowerCase(), required: !!inp.required });
        });
        forms.push({ action: form.action||undefined, method: form.method||undefined, fields: fields });
      });
      var buttons = [];
      document.querySelectorAll("button,[role='button']").forEach(function(b) {
        var t = (b.textContent||"").trim(); if(t) buttons.push(t.slice(0,80));
      });
      var links = [];
      document.querySelectorAll("a[href]").forEach(function(a) { links.push(a.href); });
      return { forms: forms, buttons: buttons, links: links };
    })()`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extracted: any = await page.evaluate(evalScript);
    // Filter same-origin links and enqueue unseen ones
    const sameOriginLinks = extracted.links.filter((l: string) => {
      try {
        return new URL(l).origin === origin;
      } catch {
        return false;
      }
    });
    for (const link of sameOriginLinks) {
      const clean = link.split("?")[0]?.split("#")[0] ?? link;
      if (!visited.has(clean)) queue.push(clean);
    }
    routeMap.push({
      url,
      title,
      forms: extracted.forms,
      buttons: [...new Set<string>(extracted.buttons)].slice(0, 20),
      links: sameOriginLinks.slice(0, 30),
      consoleErrors: pageConsoleErrors,
    });
  }
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  return {
    routeMap,
    totalVisited: visited.size,
    baseUrl: config.baseUrl,
  };
}
