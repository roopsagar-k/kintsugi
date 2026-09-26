import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";
import { KintsugiError } from "./errors.js";

export const KintsugiConfigSchema = z.object({
  projectRoot: z.string(),
  baseUrl: z.string().url(),
  startCommand: z.string().optional(),
  webServerTimeoutMs: z.number().int().min(5000).max(300000).default(120000),
  allowedHosts: z.array(z.string()),
  reporterPath: z.string(),
  createdAt: z.string(),
});

export type KintsugiConfig = z.infer<typeof KintsugiConfigSchema>;

export function configPath(projectRoot: string): string {
  return join(projectRoot, ".kintsugi", "config.json");
}

/** Reads and validates .kintsugi/config.json. Throws KintsugiError if missing or invalid. */
export function readConfig(projectRoot: string): KintsugiConfig {
  const absRoot = resolve(projectRoot);
  const path = configPath(absRoot);
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    throw new KintsugiError(
      "config_missing",
      `No .kintsugi/config.json found at ${absRoot}. Call init_project first.`,
    );
  }
  const parsed = KintsugiConfigSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new KintsugiError(
      "config_invalid",
      `Invalid .kintsugi/config.json: ${parsed.error.message.slice(0, 150)}`,
    );
  }
  return parsed.data;
}

/** Writes config.json atomically (write to .tmp then rename). */
export function writeConfig(projectRoot: string, config: KintsugiConfig): void {
  const absRoot = resolve(projectRoot);
  const dir = join(absRoot, ".kintsugi");
  mkdirSync(dir, { recursive: true });
  const path = configPath(absRoot);
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(config, null, 2) + "\n", "utf-8");
  renameSync(tmp, path);
}
