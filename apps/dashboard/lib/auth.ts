import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"
import { find, putDoc } from "./cloudant"
import type { ApiKey, VerifyResult } from "./types"

// MCP → API authentication. The MCP server sends its per-project key as a Bearer
// token; only the SHA-256 hash of the key is stored in the `apiKey` Cloudant doc.

/** SHA-256 hex of a raw API key. The raw key is never stored or logged. */
export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex")
}

/** Extract the Bearer token from the Authorization header, if present. */
export function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? ""
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] ?? null
}

/**
 * Verifies the request's API key and resolves the project it belongs to.
 * Finds the `apiKey` doc by SHA-256 hash, rejects if missing or revoked,
 * updates lastUsedAt, and returns { ok, projectId, keyId }.
 */
export async function verifyApiKey(request: NextRequest): Promise<VerifyResult> {
  const raw = bearerToken(request)
  if (!raw) return { ok: false, message: "Missing Authorization: Bearer <key> header." }

  const hash = hashKey(raw)

  const docs = await find<ApiKey>({ type: "apiKey", hash }, { limit: 1 })
  const doc = docs[0]

  if (!doc) return { ok: false, message: "Invalid or revoked API key." }
  if (doc.revoked) return { ok: false, message: "Invalid or revoked API key." }

  // Fire-and-forget lastUsedAt update — do not await to avoid adding latency.
  putDoc<ApiKey>({ ...doc, lastUsedAt: new Date().toISOString() }).catch(() => {
    // best-effort; ignore failures
  })

  return { ok: true, projectId: doc.projectId, keyId: doc._id }
}
