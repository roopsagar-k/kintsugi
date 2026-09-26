import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { find } from "@/lib/cloudant"
import { unauthorized, ok } from "@/lib/http"
import type { Event } from "@/lib/types"

// GET /api/v1/events?since=<ISO timestamp>
// The dashboard polls this every ~2s to live-update the board and activity feed.
export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const since = request.nextUrl.searchParams.get("since") ?? undefined

  const selector: Record<string, unknown> = {
    type: "event",
    projectId: auth.projectId,
    ...(since !== undefined && { ts: { $gt: since } }),
  }

  const events = await find<Event>(selector, {
    sort: [{ ts: "asc" }],
    limit: 100,
  })

  return ok({ events, now: new Date().toISOString() })
}
