import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const VERSION = "0.1.0";

export function registerPing(server: McpServer): void {
  server.tool(
    "ping",
    "Health-check tool. Returns { pong: true, version } to confirm the kintsugi-mcp server is running and reachable. Call this first to verify the MCP connection.",
    {}, // empty shape — no inputs
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({ pong: true, version: VERSION }),
        },
      ],
    }),
  );
}
