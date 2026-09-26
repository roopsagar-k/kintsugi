import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { getDoc, putDoc } from "@/lib/cloudant"
import { appendEvent } from "@/lib/events"
import { unauthorized, badRequest, notFound, ok } from "@/lib/http"
import { PatchTicketSchema } from "@/lib/schemas"
import type { Ticket, TicketHistoryEntry } from "@/lib/types"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/tickets/:id — full ticket detail (triage, evidence, history, fixDiff).
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)
  const { id } = await params

  const ticket = await getDoc<Ticket>(id)
  if (!ticket || ticket.projectId !== auth.projectId) return notFound("Ticket not found.")

  return ok(ticket)
}

// PATCH /api/v1/tickets/:id — move status, add a note, or record a fix diff.
// Both Bob (healer) and the dashboard (drag-and-drop) hit this.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)
  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = PatchTicketSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const ticket = await getDoc<Ticket>(id)
  if (!ticket || ticket.projectId !== auth.projectId) return notFound("Ticket not found.")

  const now = new Date().toISOString()
  const actor = parsed.data.actor ?? "user"
  const historyEntry: TicketHistoryEntry | null = parsed.data.status && parsed.data.status !== ticket.status
    ? {
        ts: now,
        actor,
        from: ticket.status,
        to: parsed.data.status,
        note: parsed.data.note,
      }
    : parsed.data.note
    ? { ts: now, actor, note: parsed.data.note }
    : null

  const updated: Ticket = {
    ...ticket,
    ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    ...(parsed.data.fixDiff !== undefined && { fixDiff: parsed.data.fixDiff }),
    history: historyEntry ? [...ticket.history, historyEntry] : ticket.history,
    updatedAt: now,
  }

  await putDoc(updated)

  if (parsed.data.status && parsed.data.status !== ticket.status) {
    await appendEvent(auth.projectId, "ticket.moved", {
      ticketId: id,
      from: ticket.status,
      to: parsed.data.status,
      actor,
    })
  }

  return ok(updated)
}
