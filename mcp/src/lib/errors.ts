export class KintsugiError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "KintsugiError";
    this.code = code;
    this.details = details;
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KintsugiError);
    }
  }
}

export interface ToolError {
  error: string;
  message: string;
}

/** Format a KintsugiError (or unknown error) as a compact tool error response. */
export function toToolError(err: unknown): ToolError {
  if (err instanceof KintsugiError) {
    return { error: err.code, message: err.message.slice(0, 200) };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { error: "internal_error", message: msg.slice(0, 200) };
}
