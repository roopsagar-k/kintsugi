import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { getDoc } from "@/lib/cloudant"
import { unauthorized, notFound, ok } from "@/lib/http"
import type { Project } from "@/lib/types"

// GET /api/v1/auth/verify
// The MCP calls this once on startup to confirm its key and learn its projectId.
export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const project = await getDoc<Project>(auth.projectId)
  if (!project) return notFound("Project not found.")

  return ok({
    projectId: auth.projectId,
    projectName: project.name,
    plan: "free",
  })
}
