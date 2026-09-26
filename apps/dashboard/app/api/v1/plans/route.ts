import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { putDoc } from "@/lib/cloudant"
import { appendEvent } from "@/lib/events"
import { unauthorized, badRequest, created } from "@/lib/http"
import { CreatePlanSchema } from "@/lib/schemas"
import type { TestPlan } from "@/lib/types"

// POST /api/v1/plans — Bob saves a lane-based test plan for its project.
export async function POST(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const body = await request.json().catch(() => null)
  const parsed = CreatePlanSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const now = new Date().toISOString()
  const planId = `plan:${randomUUID()}`

  const doc: TestPlan = {
    _id: planId,
    type: "testPlan",
    projectId: auth.projectId,
    source: parsed.data.source,
    lanes: parsed.data.lanes,
    createdAt: now,
  }

  await putDoc(doc)
  await appendEvent(auth.projectId, "plan.created", { planId })

  const appUrl = process.env.APP_URL ?? ""
  return created({
    planId,
    dashboardUrl: `${appUrl}/projects/${auth.projectId}`,
    createdAt: now,
  })
}
