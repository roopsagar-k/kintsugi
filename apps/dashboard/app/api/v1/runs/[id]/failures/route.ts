import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { find, getDoc } from "@/lib/cloudant"
import { unauthorized, badRequest, notFound, ok } from "@/lib/http"
import { SeverityEnum } from "@/lib/schemas"
import type { Result, Ticket } from "@/lib/types"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/runs/:id/failures?severity=critical|high|medium|low
// Returns per-failure detail + triage for a completed run.
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)
  const { id: runId } = await params

  const severityParam = request.nextUrl.searchParams.get("severity")
  const severity = severityParam ? SeverityEnum.safeParse(severityParam) : null
  if (severity && !severity.success) return badRequest("Invalid severity filter.")

  // Verify the run belongs to this project.
  const run = await find<{ projectId: string }>({ type: "run", _id: runId }, { limit: 1 })
  if (run.length === 0) {
    // Fall back to getDoc for direct id lookup
    const runDoc = await getDoc<{ projectId: string }>(runId)
    if (!runDoc || runDoc.projectId !== auth.projectId) return notFound("Run not found.")
  } else if (run[0].projectId !== auth.projectId) {
    return notFound("Run not found.")
  }

  const selector: Record<string, unknown> = {
    type: "result",
    runId,
    projectId: auth.projectId,
  }

  const results = await find<Result>(selector)
  const failures = results.filter(
    r => r.status === "failed" || r.status === "timedOut",
  )

  // Load associated tickets for triage data.
  const tickets = await find<Ticket>({ type: "ticket", runId, projectId: auth.projectId })
  const ticketByTestId = new Map<string, Ticket>()
  for (const t of tickets) {
    ticketByTestId.set(t.testId, t)
  }

  // Build failure details, optionally filtered by severity.
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const details = failures
    .map(r => {
      const ticket = ticketByTestId.get(r.testId)
      return {
        resultId: r._id,
        testId: r.testId,
        title: r.title,
        specFile: r.specFile,
        line: r.line,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error,
        ticketId: ticket?._id,
        triage: ticket?.triage,
        severity: ticket?.severity ?? "medium",
        evidence: ticket?.evidence ?? [],
      }
    })
    .filter(d => !severity || d.severity === severity.data)
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))

  return ok({ failures: details, total: details.length, runId })
}
