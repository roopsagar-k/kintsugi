import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { getDoc, putDoc } from "@/lib/cloudant"
import { appendEvent } from "@/lib/events"
import { unauthorized, badRequest, notFound, ok } from "@/lib/http"
import { PatchRunSchema } from "@/lib/schemas"
import type { Run } from "@/lib/types"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/runs/:id — fetch a run's status and counts.
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)
  const { id } = await params

  const run = await getDoc<Run>(id)
  if (!run || run.projectId !== auth.projectId) return notFound("Run not found.")

  return ok({
    runId: id,
    status: run.status,
    counts: run.counts,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
  })
}

// PATCH /api/v1/runs/:id — update status/counts as a run progresses and finishes.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)
  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = PatchRunSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const run = await getDoc<Run>(id)
  if (!run || run.projectId !== auth.projectId) return notFound("Run not found.")

  const updatedAt = new Date().toISOString()
  const updated: Run = {
    ...run,
    status: parsed.data.status,
    ...(parsed.data.counts !== undefined && { counts: parsed.data.counts }),
    ...(parsed.data.endedAt !== undefined && { endedAt: parsed.data.endedAt }),
  }

  await putDoc(updated)
  await appendEvent(auth.projectId, "run.updated", { runId: id, status: parsed.data.status, updatedAt })

  return ok({ runId: id, status: updated.status, updatedAt })
}
