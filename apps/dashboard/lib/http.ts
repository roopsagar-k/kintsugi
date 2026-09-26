import { NextResponse } from "next/server"

// Compact, consistent JSON responses for every route handler.
// Error bodies are always { error, message } to match the MCP client's expectations.

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { status: 200, ...init })
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: "bad_request", message: message.slice(0, 300) }, { status: 400 })
}

export function unauthorized(message = "Invalid or missing API key"): NextResponse {
  return NextResponse.json({ error: "unauthorized", message }, { status: 401 })
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: "forbidden", message }, { status: 403 })
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: "not_found", message }, { status: 404 })
}

export function serverError(message = "Internal error. See server logs."): NextResponse {
  return NextResponse.json({ error: "internal_error", message: message.slice(0, 300) }, { status: 500 })
}

/**
 * Placeholder for handlers whose persistence logic Bob still needs to implement.
 * Returns 501 so the app builds and runs while the TODO(bob) blocks are filled in.
 */
export function notImplemented(what: string): NextResponse {
  return NextResponse.json(
    { error: "not_implemented", message: `${what} — pending TODO(bob) implementation.` },
    { status: 501 },
  )
}
