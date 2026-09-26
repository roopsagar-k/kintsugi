/**
 * Returns the content of the generated `.kintsugi/tests/fixtures.ts` file as a string.
 * Every spec must import `test` and `expect` from this file (not from @playwright/test directly)
 * to get automatic console-error and failed-request capture.
 */
export function fixturesFileContent(): string {
  return `import { test as base, expect } from "@playwright/test";

type ConsoleMsg = { type: string; text: string };
type FailedReq = { method: string; url: string; status: number };

export const test = base.extend<{
  consoleErrors: ConsoleMsg[];
  failedRequests: FailedReq[];
}>({
  // { auto: true } so capture runs for EVERY test even when the spec never
  // destructures the fixture — otherwise the attachments below are never produced
  // and triage loses its console-error / failed-request signals.
  consoleErrors: [async ({ page }, use, testInfo) => {
    const errors: ConsoleMsg[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push({ type: "error", text: msg.text() });
    });
    await use(errors);
    // Attach in teardown phase so the Kintsugi reporter can read it
    await testInfo.attach("kintsugi:console", {
      body: JSON.stringify(errors),
      contentType: "application/json",
    });
  }, { auto: true }],
  failedRequests: [async ({ page }, use, testInfo) => {
    const failed: FailedReq[] = [];
    page.on("requestfailed", req =>
      failed.push({ method: req.method(), url: req.url(), status: 0 })
    );
    page.on("response", res => {
      if (res.status() >= 400)
        failed.push({ method: res.request().method(), url: res.url(), status: res.status() });
    });
    await use(failed);
    await testInfo.attach("kintsugi:requests", {
      body: JSON.stringify(failed),
      contentType: "application/json",
    });
  }, { auto: true }],
});

export { expect } from "@playwright/test";
`;
}
