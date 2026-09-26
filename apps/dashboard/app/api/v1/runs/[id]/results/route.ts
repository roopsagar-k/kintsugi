import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { find, getDoc, putDoc } from "@/lib/cloudant"
import { appendEvent } from "@/lib/events"
import { unauthorized, badRequest, notFound, created } from "@/lib/http"
import { PostResultSchema } from "@/lib/schemas"
import { triageFailure } from "@/lib/triage"
import type { Result, Run, Ticket, TicketEvidence } from "@/lib/types"

type Ctx = { params: Promise<{ id: string }> }

// POST /api/v1/runs/:id/results — one call per finished test (posted by the MCP).
// On failures this is where a ticket gets auto-created and triage is attached.
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)
  const { id: runId } = await params

  const body = await request.json().catch(() => null)
  const parsed = PostResultSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  // Verify the run belongs to this project.
  const run = await getDoc<Run>(runId)
  if (!run || run.projectId !== auth.projectId) return notFound("Run not found.")

  const { testId, retryIndex } = parsed.data

  // ── Idempotency: check for an existing result with same (runId, testId, retryIndex)
  const existing = await find<Result>(
    { type: "result", runId, testId, retryIndex },
    { limit: 1 },
  )
  if (existing.length > 0) {
    const prev = existing[0]
    // Look up any existing ticket for this result
    const tickets = await find<Ticket>(
      { type: "ticket", runId, testId, projectId: auth.projectId },
      { limit: 1 },
    )
    return created({ resultId: prev._id, ticketId: tickets[0]?._id ?? undefined })
  }

  const now = new Date().toISOString()
  const resultId = `result:${randomUUID()}`

  const resultDoc: Result = {
    _id: resultId,
    type: "result",
    projectId: auth.projectId,
    runId,
    testId,
    retryIndex,
    title: parsed.data.title,
    specFile: parsed.data.specFile,
    line: parsed.data.line,
    status: parsed.data.status,
    durationMs: parsed.data.durationMs,
    error: parsed.data.error,
    console: parsed.data.console,
    network: parsed.data.network,
    domSnippet: parsed.data.domSnippet,
    screenshotUrl: parsed.data.screenshotUrl,
    diffPct: parsed.data.diffPct,
    diffUrl: parsed.data.diffUrl,
    createdAt: now,
  }

  await putDoc(resultDoc)
  await appendEvent(auth.projectId, "result.posted", { resultId, runId, testId, status: resultDoc.status })

  // ── Auto-ticket for failed / timedOut results ──────────────────────────────
  let ticketId: string | undefined

  if (parsed.data.status === "failed" || parsed.data.status === "timedOut") {
    const triage = await triageFailure(resultDoc)

    const evidence: TicketEvidence[] = []
    if (parsed.data.screenshotUrl) {
      evidence.push({ kind: "screenshot", url: parsed.data.screenshotUrl })
    }
    if (parsed.data.diffUrl) {
      evidence.push({ kind: "diff", url: parsed.data.diffUrl })
    }
    if (parsed.data.console.some(m => m.type === "error")) {
      evidence.push({ kind: "console", note: parsed.data.console.filter(m => m.type === "error").map(m => m.text).join("\n").slice(0, 500) })
    }
    if (parsed.data.network.some(n => n.status >= 400)) {
      evidence.push({
        kind: "network",
        note: parsed.data.network.filter(n => n.status >= 400).map(n => `${n.method} ${n.url} → ${n.status}`).join("\n").slice(0, 500),
      })
    }

    ticketId = `ticket:${randomUUID()}`
    const ticket: Ticket = {
      _id: ticketId,
      type: "ticket",
      projectId: auth.projectId,
      title: parsed.data.title,
      status: "Backlog",
      severity: triage.severity,
      runId,
      testId,
      triage,
      evidence,
      attempts: 0,
      history: [
        {
          ts: now,
          actor: "bob",
          to: "Backlog",
          note: `Auto-created from ${parsed.data.status} result.`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }

    await putDoc(ticket)
    await appendEvent(auth.projectId, "ticket.created", {
      ticketId,
      runId,
      testId,
      severity: triage.severity,
      status: "Backlog",
    })
  }

  return created({ resultId, ticketId })
}
