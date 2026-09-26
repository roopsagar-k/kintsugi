import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getMedia, signedMediaUrl } from "@/lib/storage"
import { notFound } from "@/lib/http"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/artifacts/:id  where :id is the URL-encoded object key,
// e.g. "<projectId>/<runId>/<testId>/screenshot.png".
// Serves media from the COS bucket (redirect to a signed URL) or streams the
// Cloudant-attachment fallback.
//
// NOTE: viewing is intentionally unauthenticated so the dashboard's <img> tags can
// load evidence directly (a browser can't send the MCP Bearer key). Uploads
// (POST /artifacts) remain authenticated. For production, gate this by the
// signed-in user's session instead.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const key = decodeURIComponent(id)

  // Prefer a short-lived signed URL when COS supports it (offloads the bytes).
  const signed = await signedMediaUrl(key)
  if (signed) return NextResponse.redirect(signed)

  const media = await getMedia(key)
  if (!media) return notFound("Artifact not found.")

  const body = media.data.buffer.slice(
    media.data.byteOffset,
    media.data.byteOffset + media.data.byteLength,
  ) as ArrayBuffer
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.data.length),
      "Cache-Control": "public, max-age=86400",
    },
  })
}
