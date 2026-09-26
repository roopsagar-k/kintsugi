import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { find } from "@/lib/cloudant"
import { unauthorized, badRequest, ok } from "@/lib/http"
import { TicketStatusEnum } from "@/lib/schemas"
import type { Ticket } from "@/lib/types"

// GET /api/v1/tickets?status=Backlog|InProgress|InReview|Done|NeedsHuman
// The Kanban board data for the authenticated project.
export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const statusParam = request.nextUrl.searchParams.get("status")
  const status = statusParam ? TicketStatusEnum.safeParse(statusParam) : null
  if (status && !status.success) return badRequest("Invalid ticket status filter.")

  const selector: Record<string, unknown> = {
    type: "ticket",
    projectId: auth.projectId,
    ...(status?.data !== undefined && { status: status.data }),
  }

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  // Fetch by indexed selector; ordering is done in JS below (severity, then
  // createdAt), so no Cloudant sort index is required.
  const tickets = await find<Ticket>(selector)

  const sorted = tickets.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3) ||
      a.createdAt.localeCompare(b.createdAt),
  )

  return ok({ tickets: sorted, total: sorted.length })
}
