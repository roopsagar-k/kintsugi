import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "./lib/logger.js";

const SERVER_NAME = "kintsugi-mcp";
const SERVER_VERSION = "0.1.0";

/** Creates a fresh McpServer instance. Register tools before calling startServer(). */
export function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
}

/** Connects the server to stdio transport and begins listening. Never resolves. */
export async function startServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("kintsugi-mcp started", { version: SERVER_VERSION, transport: "stdio" });
}
