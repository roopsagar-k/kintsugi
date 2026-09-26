import { watch, createReadStream, existsSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { logger } from "../lib/logger.js";
import type { IKintsugiStore } from "../api/interface.js";
import type { RunState } from "./run-registry.js";
import type { RunSummary, TestResultStatus, ConsoleMsg, FailedReq } from "../api/types.js";

interface ResultLine {
  event: "result";
  testId: string;
  retryIndex: number;
  title: string;
  specFile: string;
  line: number;
  status: string;
  duration: number;
  error?: { message: string; stack?: string };
  consoleErrors: ConsoleMsg[];
  failedRequests: FailedReq[];
  domSnippet?: string;
  screenshotPath?: string;
  tracePath?: string;
  videoPath?: string;
}

interface EndLine {
  event: "end";
  status: string;
  summary: { total: number; passed: number; failed: number; skipped: number; duration: number };
}

type NdjsonLine = ResultLine | EndLine;

/**
 * Starts tailing {ndjsonPath} for NDJSON lines written by KintsugiReporter.
 * Uses fs.watch as primary signal + 500ms setInterval fallback for Docker/NFS mounts.
 * Updates RunState.progress as results arrive.
 * On "end" line, calls store.patchRun and resolves the RunState.completionPromise.
 */
export function startResultCollector(
  ndjsonPath: string,
  runId: string,
  state: RunState,
  store: IKintsugiStore,
): void {
  let bytesRead = 0;
  let settled = false;
  const readNewLines = (): void => {
    if (!existsSync(ndjsonPath)) return;
    const currentSize = statSync(ndjsonPath).size;
    if (currentSize <= bytesRead) return;
    const stream = createReadStream(ndjsonPath, {
      start: bytesRead,
      end: currentSize - 1,
      encoding: "utf-8",
    });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", (rawLine) => {
      const line = rawLine.trim();
      if (!line) return;
      let parsed: NdjsonLine;
      try {
        parsed = JSON.parse(line) as NdjsonLine;
      } catch {
        return;
      }
      if (parsed.event === "result") {
        processResult(parsed, runId, state, store);
      } else if (parsed.event === "end" && !settled) {
        settled = true;
        processEnd(parsed, runId, state, store);
      }
    });
    stream.on("end", () => {
      bytesRead = currentSize;
    });
  };
  // Primary: fs.watch
  try {
    state.watcher = watch(existsSync(ndjsonPath) ? ndjsonPath : ndjsonPath.replace(/[^/]+$/, ""), () => {
      readNewLines();
    });
  } catch {
    // fs.watch failed (e.g. file doesn't exist yet) — interval covers it
  }
  // Fallback: poll every 500ms
  state.intervalId = setInterval(readNewLines, 500);
  // Also handle early child exit (app didn't start)
  state.child.on("exit", (code) => {
    // Give the collector a moment to flush the last lines
    setTimeout(() => {
      readNewLines();
      if (!settled) {
        settled = true;
        const msg =
          code !== 0
            ? "Playwright child exited with no test results. App may have failed to start — check webServer.timeout and startCommand."
            : "Playwright finished with no results written.";
        logger.warn("child exit without end line", { runId, code });
        // Reject the completion promise
        state.reject(new Error(msg));
        clearInterval(state.intervalId);
        state.watcher?.close();
      }
    }, 600);
  });
}

function processResult(
  line: ResultLine,
  runId: string,
  state: RunState,
  store: IKintsugiStore,
): void {
  state.progress.done++;
  state.progress.total = Math.max(state.progress.total, state.progress.done);
  if (line.status === "passed") state.progress.passed++;
  else if (line.status !== "skipped") state.progress.failed++;
  // Upload artifacts and post result — fire-and-forget to not block line reading
  void (async () => {
    const uploadIfPresent = async (
      filePath: string | undefined,
      type: "screenshot" | "trace" | "video",
    ): Promise<string | undefined> => {
      if (!filePath || !existsSync(filePath)) return undefined;
      try {
        const artifact = await store.uploadArtifact({ runId, testId: line.testId, type, filePath });
        return artifact.url;
      } catch (e) {
        logger.warn("artifact upload failed", { type, err: String(e).slice(0, 100) });
        return undefined;
      }
    };
    const screenshotUrl = await uploadIfPresent(line.screenshotPath, "screenshot");
    const traceUrl = await uploadIfPresent(line.tracePath, "trace");
    const videoUrl = await uploadIfPresent(line.videoPath, "video");
    try {
      await store.postResult({
        runId,
        testId: line.testId,
        retryIndex: line.retryIndex,
        title: line.title,
        specFile: line.specFile,
        line: line.line,
        status: line.status as TestResultStatus,
        duration: line.duration,
        error: line.error,
        consoleErrors: line.consoleErrors,
        failedRequests: line.failedRequests,
        domSnippet: line.domSnippet,
        screenshotUrl,
        traceUrl,
        videoUrl,
      });
    } catch (e) {
      logger.warn("postResult failed", { err: String(e).slice(0, 100) });
    }
  })();
}

function processEnd(line: EndLine, runId: string, state: RunState, store: IKintsugiStore): void {
  clearInterval(state.intervalId);
  state.watcher?.close();
  const summary: RunSummary = {
    ...line.summary,
    ticketIds: [], // populated after postResult calls complete
  };
  void (async () => {
    try {
      await store.patchRun(runId, {
        status: line.status === "passed" ? "passed" : "failed",
        summary,
      });
      // Fetch updated run to get ticketIds from auto-created tickets
      const updatedRun = await store.getRun(runId);
      state.resolve(updatedRun.summary ?? summary);
    } catch (e) {
      logger.warn("patchRun failed", { err: String(e).slice(0, 100) });
      state.resolve(summary);
    }
  })();
}
