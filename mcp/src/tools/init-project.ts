import { existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeConfig } from "../lib/config.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { generatePlaywrightConfig } from "../generated/playwright-config.js";
import { fixturesFileContent } from "../generated/fixtures-template.js";

const InputSchema = {
  projectRoot: z.string().describe("Absolute path to the project being tested"),
  baseUrl: z.string().url().describe("Base URL of the running app, e.g. http://localhost:3000"),
  startCommand: z
    .string()
    .optional()
    .describe("Shell command to start the app, e.g. 'npm run dev'. Omit if app is always running."),
  webServerTimeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(300000)
    .default(120000)
    .describe("Max ms to wait for the app to start. Default 120000 (2 min). Increase for slow builds."),
};

interface InitProjectArgs {
  projectRoot: string;
  baseUrl: string;
  startCommand?: string;
  webServerTimeoutMs: number;
}

export function registerInitProject(server: McpServer): void {
  server.tool(
    "init_project",
    "Initialises the Kintsugi QA workspace for a project. Creates .kintsugi/config.json, " +
      ".kintsugi/playwright.config.ts (webServer auto-start, screenshot-on-failure, trace-on-failure, " +
      "video-on-failure, Kintsugi reporter), and .kintsugi/tests/fixtures.ts (auto-records console errors " +
      "and failed HTTP requests). Checks that @playwright/test and Chromium are installed and returns the " +
      "install commands if not. Call this ONCE before any other Kintsugi tool. Returns ready: true when all " +
      "prerequisites are met.",
    InputSchema,
    async (args) => {
      try {
        const result = await initProject(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (err) {
        logger.error("init_project failed", { err: String(err) });
        return {
          content: [{ type: "text", text: JSON.stringify(toToolError(err)) }],
        };
      }
    },
  );
}

async function initProject(args: InitProjectArgs) {
  const projectRoot = resolve(args.projectRoot);
  const installCommands: string[] = [];
  // ── 1. Check @playwright/test ────────────────────────────────────────────
  const pwPkg = join(projectRoot, "node_modules", "@playwright", "test", "package.json");
  const playwrightInstalled = existsSync(pwPkg);
  if (!playwrightInstalled) {
    installCommands.push("npm install --save-dev @playwright/test");
  }
  // ── 2. Check Chromium browser binaries ───────────────────────────────────
  // Playwright resolves browsers from PLAYWRIGHT_BROWSERS_PATH, else the OS cache
  // (~/.cache/ms-playwright on Linux), else node_modules/.local-browsers when
  // PLAYWRIGHT_BROWSERS_PATH=0. Check all of them so we don't wrongly report the
  // browser missing just because it lives in the shared cache.
  const browsersInstalled = chromiumInstalled(projectRoot);
  if (!browsersInstalled) {
    installCommands.push("npx playwright install chromium");
  }
  if (installCommands.length > 0) {
    return {
      ready: false,
      createdFiles: [] as string[],
      playwrightInstalled,
      browsersInstalled,
      installCommands,
      configPath: join(projectRoot, ".kintsugi", "config.json"),
    };
  }
  // ── 3. Resolve reporter path ─────────────────────────────────────────────
  // __dirname equivalent in ESM: the dist/tools/ directory
  const thisFile = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(thisFile)); // dist/
  const reporterPath = join(dirname(distDir), "reporter", "index.js");
  // ── 4. Create directories ─────────────────────────────────────────────────
  const kintsugiDir = join(projectRoot, ".kintsugi");
  const dirsToCreate = [
    kintsugiDir,
    join(kintsugiDir, "tests"),
    join(kintsugiDir, ".results"),
    join(kintsugiDir, "baselines"),
    join(kintsugiDir, ".local"),
    join(kintsugiDir, ".runs"),
  ];
  for (const dir of dirsToCreate) {
    mkdirSync(dir, { recursive: true });
  }
  const createdFiles: string[] = [];
  // ── 5. Write config.json (skip if already exists) ─────────────────────────
  const cfgPath = join(kintsugiDir, "config.json");
  if (!existsSync(cfgPath)) {
    const baseUrlObj = new URL(args.baseUrl);
    writeConfig(projectRoot, {
      projectRoot,
      baseUrl: args.baseUrl,
      startCommand: args.startCommand,
      webServerTimeoutMs: args.webServerTimeoutMs,
      allowedHosts: [baseUrlObj.hostname],
      reporterPath,
      createdAt: new Date().toISOString(),
    });
    createdFiles.push(cfgPath);
  }
  // ── 6. Write playwright.config.ts ─────────────────────────────────────────
  const playwrightCfgPath = join(kintsugiDir, "playwright.config.ts");
  if (!existsSync(playwrightCfgPath)) {
    const content = generatePlaywrightConfig({
      baseUrl: args.baseUrl,
      startCommand: args.startCommand,
      webServerTimeoutMs: args.webServerTimeoutMs,
      reporterPath,
    });
    writeFileSync(playwrightCfgPath, content, "utf-8");
    createdFiles.push(playwrightCfgPath);
  }
  // ── 7. Write tests/fixtures.ts ────────────────────────────────────────────
  const fixturesPath = join(kintsugiDir, "tests", "fixtures.ts");
  if (!existsSync(fixturesPath)) {
    writeFileSync(fixturesPath, fixturesFileContent(), "utf-8");
    createdFiles.push(fixturesPath);
  }
  // ── 8. Write .gitignore ───────────────────────────────────────────────────
  const gitignorePath = join(kintsugiDir, ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, ".results/\n.local/\n.runs/\n", "utf-8");
    createdFiles.push(gitignorePath);
  }
  logger.info("init_project complete", { projectRoot, createdFiles: createdFiles.length });
  return {
    ready: true,
    createdFiles,
    playwrightInstalled: true,
    browsersInstalled: true,
    configPath: cfgPath,
  };
}

/** Returns true if a Chromium build is installed in any location Playwright checks. */
function chromiumInstalled(projectRoot: string): boolean {
  const candidates: string[] = [];
  const envPath = process.env["PLAYWRIGHT_BROWSERS_PATH"];
  if (envPath && envPath !== "0") {
    candidates.push(envPath);
  }
  // PLAYWRIGHT_BROWSERS_PATH=0 (or unset) → browsers may live under node_modules
  candidates.push(join(projectRoot, "node_modules", "playwright-core", ".local-browsers"));
  // Default OS cache used when PLAYWRIGHT_BROWSERS_PATH is unset
  const home = homedir();
  if (process.platform === "darwin") {
    candidates.push(join(home, "Library", "Caches", "ms-playwright"));
  } else if (process.platform === "win32") {
    candidates.push(join(process.env["LOCALAPPDATA"] ?? join(home, "AppData", "Local"), "ms-playwright"));
  } else {
    candidates.push(join(process.env["XDG_CACHE_HOME"] ?? join(home, ".cache"), "ms-playwright"));
  }
  for (const dir of candidates) {
    try {
      if (existsSync(dir) && readdirSync(dir).some((e) => e.startsWith("chromium"))) {
        return true;
      }
    } catch {
      // unreadable candidate — try the next
    }
  }
  return false;
}
