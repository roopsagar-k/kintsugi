interface PlaywrightConfigOpts {
  baseUrl: string;
  startCommand?: string;
  webServerTimeoutMs: number;
  reporterPath: string;
  testDir?: string;
}

/**
 * Returns the content of the generated `.kintsugi/playwright.config.ts` file as a string.
 * The config reads its runtime values from `./config.json`, so it stays up-to-date
 * without regeneration when config values change.
 */
export function generatePlaywrightConfig(_opts: PlaywrightConfigOpts): string {
  // The generated config reads config.json at runtime — values are not baked into this string.
  // We read via fs rather than a JSON import assertion: the `assert { type: "json" }` syntax is
  // removed in Node >=22 (hard SyntaxError) and `with { type: "json" }` isn't supported by every
  // Playwright config loader. Reading the file relative to import.meta.url works everywhere.
  return `import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("./config.json", import.meta.url), "utf-8"),
) as {
  baseUrl: string;
  startCommand?: string;
  webServerTimeoutMs: number;
  reporterPath: string;
};

export default defineConfig({
  testDir: "./tests",
  outputDir: "./.results",
  use: {
    baseURL: config.baseUrl,
    // Full evidence capture on failure — Kintsugi uploads these to the dashboard (COS).
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  reporter: [
    ["list"],
    [config.reporterPath],
  ],
  ...(config.startCommand
    ? {
        webServer: {
          command: config.startCommand,
          url: config.baseUrl,
          reuseExistingServer: true,
          timeout: config.webServerTimeoutMs,
        },
      }
    : {}),
});
`;
}
