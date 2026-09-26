import { resolve, join } from "node:path";
import { KintsugiError } from "./errors.js";
import type { KintsugiConfig } from "./config.js";

/**
 * Asserts that filePath is under {projectRoot}/.kintsugi/tests/.
 * Throws KintsugiError("forbidden") if not.
 * Uses path.resolve to canonicalise — prevents ../ traversal.
 */
export function assertUnderTestsDir(projectRoot: string, filePath: string): void {
  const absRoot = resolve(projectRoot);
  const testsDir = join(absRoot, ".kintsugi", "tests");
  const absFile = resolve(filePath);
  if (!absFile.startsWith(testsDir + "/") && absFile !== testsDir) {
    throw new KintsugiError(
      "forbidden",
      "Access denied: path is outside the allowed test directory.",
    );
  }
}

/**
 * Asserts that the hostname of url is in config.allowedHosts.
 * Throws KintsugiError("forbidden") if not.
 */
export function assertAllowedHost(config: KintsugiConfig, url: string): void {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new KintsugiError("forbidden", `Invalid URL: ${url.slice(0, 80)}`);
  }
  if (!config.allowedHosts.includes(hostname)) {
    throw new KintsugiError(
      "forbidden",
      `Host "${hostname}" is not in the allowedHosts list. Add it to .kintsugi/config.json.`,
    );
  }
}

/**
 * Replaces any string that looks like an API key (40+ hex/base64 chars) with [REDACTED].
 * Applied to all strings before they enter log output.
 */
export function redactKey(text: string): string {
  // Matches typical API key patterns: long alphanumeric/base64 tokens
  return text.replace(/[A-Za-z0-9+/=_\-]{40,}/g, "[REDACTED]");
}
