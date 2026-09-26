// KintsugiReporter — Playwright custom reporter.
// Writes NDJSON result lines to KINTSUGI_NDJSON_PATH.
// The parent MCP process tails that file to track progress.
// This file is intentionally self-contained with no imports from src/ so it can
// be compiled and referenced as a standalone Playwright reporter path.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
export default class KintsugiReporter {
    ndjsonPath;
    counts = { total: 0, passed: 0, failed: 0, skipped: 0 };
    constructor() {
        this.ndjsonPath = process.env["KINTSUGI_NDJSON_PATH"] ?? "";
        if (this.ndjsonPath) {
            try {
                mkdirSync(dirname(this.ndjsonPath), { recursive: true });
            }
            catch {
                // best-effort
            }
        }
    }
    onTestEnd(test, result) {
        this.counts.total++;
        if (result.status === "passed")
            this.counts.passed++;
        else if (result.status === "skipped")
            this.counts.skipped++;
        else
            this.counts.failed++;
        const screenshotPath = result.attachments.find((a) => a.name === "screenshot")?.path;
        const consoleErrors = parseJsonAttachment(result, "kintsugi:console") ?? [];
        const failedRequests = parseJsonAttachment(result, "kintsugi:requests") ?? [];
        const domSnippet = parseStringAttachment(result, "kintsugi:dom");
        const line = JSON.stringify({
            event: "result",
            testId: test.id,
            retryIndex: result.retry,
            title: test.title,
            specFile: test.location.file,
            line: test.location.line,
            status: result.status,
            duration: result.duration,
            error: result.error
                ? { message: result.error.message ?? "", stack: result.error.stack }
                : undefined,
            consoleErrors,
            failedRequests,
            domSnippet,
            screenshotPath, // parent reads this path and uploads as artifact
        });
        this.writeLine(line);
    }
    onEnd(result) {
        const line = JSON.stringify({
            event: "end",
            status: result.status,
            summary: { ...this.counts, duration: result.duration },
        });
        this.writeLine(line);
    }
    writeLine(line) {
        if (!this.ndjsonPath)
            return;
        try {
            appendFileSync(this.ndjsonPath, line + "\n");
        }
        catch {
            // Never crash the test run due to reporter errors
        }
    }
}
function parseJsonAttachment(result, name) {
    const att = result.attachments.find((a) => a.name === name);
    if (!att?.body)
        return undefined;
    try {
        return JSON.parse(att.body.toString());
    }
    catch {
        return undefined;
    }
}
function parseStringAttachment(result, name) {
    return result.attachments.find((a) => a.name === name)?.body?.toString();
}
//# sourceMappingURL=index.js.map