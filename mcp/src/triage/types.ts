import type { TriageResult, TriagePending } from "../api/types.js";
export type { TriageResult, TriagePending };

/** Input shape for triage — matches the fields available from a test result. */
export interface TriageInput {
  title: string;
  specFile: string;
  status: string;
  error?: {
    message: string;
    stack?: string;
  };
  consoleErrors: Array<{
    type: string;
    text: string;
  }>;
  failedRequests: Array<{
    method: string;
    url: string;
    status: number;
  }>;
  domSnippet?: string;
}
