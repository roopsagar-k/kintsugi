import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { putDoc } from "@/lib/cloudant"
import { appendEvent } from "@/lib/events"
import { unauthorized, badRequest, created } from "@/lib/http"
import { CreateRunSchema } from "@/lib/schemas"
import type { Run } from "@/lib/types"

// POST /api/v1/runs — open a new run record when Bob starts a test run.
export async function POST(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const body = await request.json().catch(() => null)
  const parsed = CreateRunSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const now = new Date().toISOString()
  const runId = `run:${randomUUID()}`

  const doc: Run = {
    _id: runId,
    type: "run",
    projectId: auth.projectId,
    planId: parsed.data.planId,
    status: "queued",
    startedAt: now,
    trigger: parsed.data.trigger ?? "bob",
  }

  await putDoc(doc)
  await appendEvent(auth.projectId, "run.started", { runId, trigger: doc.trigger })

  return created({ runId, status: "queued", createdAt: now })
}
