import { z } from "zod";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toToolError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getStore } from "../api/interface.js";

const TICKET_STATUSES = ["Backlog", "InProgress", "InReview", "Done", "NeedsHuman"] as const;

// ─── list_tickets ────────────────────────────────────────────────────────────
export function registerListTickets(server: McpServer): void {
  server.tool(
    "list_tickets",
    "Returns all Kanban tickets for test failures, filterable by status: Backlog, InProgress, " +
      "InReview, Done, NeedsHuman. Returns compact list (ticketId, title, severity, status). " +
      "Use to see what Bob needs to fix.",
    {
      projectRoot: z.string().optional(),
      status: z.enum(TICKET_STATUSES).optional(),
    },
    async (args) => {
      try {
        const projectRoot = resolve(args.projectRoot ?? ".");
        const store = await getStore(projectRoot);
        let projectId = "local";
        try {
          const auth = await store.verifyKey();
          projectId = auth.projectId;
        } catch {
          projectId = "local";
        }
        const tickets = await store.listTickets(projectId, args.status);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ tickets, total: tickets.length }),
            },
          ],
        };
      } catch (err) {
        logger.error("list_tickets failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

// ─── get_ticket ──────────────────────────────────────────────────────────────
export function registerGetTicket(server: McpServer): void {
  server.tool(
    "get_ticket",
    "Returns full detail for one ticket: triage result, error, evidence URLs, fix diff.",
    {
      ticketId: z.string(),
      projectRoot: z.string().optional(),
    },
    async (args) => {
      try {
        const projectRoot = resolve(args.projectRoot ?? ".");
        const store = await getStore(projectRoot);
        const ticket = await store.getTicket(args.ticketId);
        return {
          content: [{ type: "text", text: JSON.stringify(ticket) }],
        };
      } catch (err) {
        logger.error("get_ticket failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}

// ─── update_ticket ───────────────────────────────────────────────────────────
export function registerUpdateTicket(server: McpServer): void {
  server.tool(
    "update_ticket",
    "Updates ticket status, adds a note, or records a fix diff. Valid statuses: Backlog, " +
      "InProgress, InReview, Done, NeedsHuman. Set NeedsHuman when Bob cannot determine the fix.",
    {
      ticketId: z.string(),
      projectRoot: z.string().optional(),
      status: z.enum(TICKET_STATUSES).optional(),
      note: z.string().optional(),
      fixDiff: z.string().optional(),
    },
    async (args) => {
      try {
        const projectRoot = resolve(args.projectRoot ?? ".");
        const store = await getStore(projectRoot);
        const updated = await store.patchTicket(args.ticketId, {
          status: args.status,
          note: args.note,
          fixDiff: args.fixDiff,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(updated) }],
        };
      } catch (err) {
        logger.error("update_ticket failed", { err: String(err) });
        return { content: [{ type: "text", text: JSON.stringify(toToolError(err)) }] };
      }
    },
  );
}
