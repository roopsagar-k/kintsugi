import type { RunSummary } from "../api/types.js";
import type { ChildProcess } from "node:child_process";
import type { FSWatcher } from "node:fs";

export interface RunProgress {
  done: number;
  total: number;
  passed: number;
  failed: number;
}

export interface RunState {
  child: ChildProcess;
  projectRoot: string;
  ndjsonPath: string;
  progress: RunProgress;
  completionPromise: Promise<RunSummary>;
  resolve: (summary: RunSummary) => void;
  reject: (err: Error) => void;
  watcher?: FSWatcher;
  intervalId?: ReturnType<typeof setInterval>;
}

class RunRegistry {
  private readonly map = new Map<string, RunState>();

  register(runId: string, state: RunState): void {
    this.map.set(runId, state);
  }

  get(runId: string): RunState | undefined {
    return this.map.get(runId);
  }

  /** Find any active run for the given projectRoot. */
  findActiveByProject(projectRoot: string): RunState | undefined {
    for (const state of this.map.values()) {
      if (state.projectRoot === projectRoot) return state;
    }
    return undefined;
  }

  delete(runId: string): void {
    this.map.delete(runId);
  }

  all(): IterableIterator<[string, RunState]> {
    return this.map.entries();
  }
}

// Singleton — one registry per MCP server process
export const runRegistry = new RunRegistry();
