// Structured JSON logger that writes only to stderr.
// stdout is reserved for the MCP wire protocol — any write there corrupts the session.

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

function log(level: LogLevel, msg: string, meta?: LogMeta): void {
  const entry = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...meta,
  });
  process.stderr.write(entry + "\n");
}

export const logger = {
  debug: (msg: string, meta?: LogMeta) => log("debug", msg, meta),
  info: (msg: string, meta?: LogMeta) => log("info", msg, meta),
  warn: (msg: string, meta?: LogMeta) => log("warn", msg, meta),
  error: (msg: string, meta?: LogMeta) => log("error", msg, meta),
};
