import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { logger } from "../lib/logger.js";

interface SpawnOptions {
  projectRoot: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * Spawns `node <playwright-cli> test [args]` as a child process.
 * Uses the Playwright CLI installed in projectRoot's node_modules.
 * Returns the ChildProcess — never rejects. Failures are surfaced via exit code.
 *
 * Args example: ["test", "--config", ".kintsugi/playwright.config.ts", "tests/auth/"]
 *
 * Security: args are passed as an array to spawn() — never shell-interpolated.
 */
export function spawnPlaywright(opts: SpawnOptions): ChildProcess {
  const { projectRoot, args, env } = opts;
  // Resolve Playwright CLI path inside the project's node_modules
  const playwrightCli = join(projectRoot, "node_modules", "@playwright", "test", "cli.js");
  const childEnv = {
    ...process.env,
    ...env,
    // Ensure the project's node_modules are on the path
    NODE_PATH: join(projectRoot, "node_modules"),
  };
  logger.debug("spawning playwright", {
    cli: playwrightCli,
    args: args.join(" "),
    cwd: projectRoot,
  });
  const child = spawn(
    process.execPath, // use same node binary as the MCP server
    [playwrightCli, ...args],
    {
      cwd: projectRoot,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.on("data", (chunk: Buffer) => {
    logger.debug("playwright stdout", { line: chunk.toString().trim().slice(0, 200) });
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    logger.debug("playwright stderr", { line: chunk.toString().trim().slice(0, 200) });
  });
  return child;
}
