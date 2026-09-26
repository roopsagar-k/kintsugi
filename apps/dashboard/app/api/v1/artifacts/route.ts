import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { storeMedia } from "@/lib/storage"
import { unauthorized, badRequest, created } from "@/lib/http"
import type { ArtifactType } from "@/lib/types"

const ALLOWED_TYPES: ArtifactType[] = ["screenshot", "trace", "video", "diff"]
const EXT: Record<ArtifactType, string> = { screenshot: "png", trace: "zip", video: "webm", diff: "png" }
// Serve with a correct MIME so <img>/<video> render inline (the MCP uploads raw
// blobs with no type, which would otherwise be stored as application/octet-stream).
const MIME: Record<ArtifactType, string> = {
  screenshot: "image/png",
  trace: "application/zip",
  video: "video/webm",
  diff: "image/png",
}

// POST /api/v1/artifacts  (multipart/form-data)
// Fields: runId, testId, type ("screenshot"|"trace"|"diff"), file (binary).
// Stored in an IBM Cloud Object Storage bucket (falls back to Cloudant attachment).
export async function POST(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const form = await request.formData().catch(() => null)
  if (!form) return badRequest("Expected multipart/form-data.")

  const runId = form.get("runId")
  const testId = form.get("testId")
  const type = form.get("type")
  const file = form.get("file")
  if (typeof runId !== "string" || typeof testId !== "string" || typeof type !== "string") {
    return badRequest("Missing runId, testId, or type.")
  }
  if (!ALLOWED_TYPES.includes(type as ArtifactType)) {
    return badRequest(`type must be one of: ${ALLOWED_TYPES.join(", ")}`)
  }
  if (!(file instanceof File)) return badRequest("Missing file.")

  const data = Buffer.from(await file.arrayBuffer())
  const contentType = MIME[type as ArtifactType] ?? file.type ?? "application/octet-stream"

  // Object key is deterministic + project-scoped.
  const ext = EXT[type as ArtifactType]
  const key = `${auth.projectId}/${runId}/${testId}/${type}.${ext}`
  const artifactId = `artifact:${auth.projectId}:${runId}:${testId}:${type}`

  await storeMedia(key, data, contentType)

  const appUrl = process.env.APP_URL ?? ""
  // The URL is keyed by the object key (URL-encoded) so the GET route can map
  // straight back to the bucket object without ambiguous id parsing.
  return created({
    artifactId,
    key,
    url: `${appUrl}/api/v1/artifacts/${encodeURIComponent(key)}`,
  })
}
