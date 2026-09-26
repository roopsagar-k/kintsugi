"use server"

import { randomBytes, randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { cloudant, DB_NAME, find, getDoc, putDoc } from "@/lib/cloudant"
import { hashKey } from "@/lib/auth"
import { appendEvent } from "@/lib/events"
import type { ApiKey, Project, Ticket } from "@/lib/types"

// Server actions the dashboard UI calls directly (no API key — they run server-side).

const newRawKey = () => `kts_live_${randomBytes(24).toString("hex")}`

/**
 * Records a re-run request for a ticket. The dashboard can't run Playwright itself
 * (the MCP runs tests on the developer's machine), so this logs the request to the
 * ticket history + activity feed for Bob / a human to act on via /qa-heal.
 */
export async function requestRerun(ticketId: string): Promise<{ ok: boolean; message?: string }> {
  const ticket = await getDoc<Ticket>(ticketId)
  if (!ticket) return { ok: false, message: "Ticket not found." }

  const now = new Date().toISOString()
  ticket.history = [
    ...(ticket.history ?? []),
    { ts: now, actor: "user", note: "Re-run requested from the dashboard." },
  ]
  ticket.updatedAt = now
  await putDoc(ticket)
  await appendEvent(ticket.projectId, "ticket.rerun_requested", { ticketId, title: ticket.title })

  revalidatePath("/board")
  revalidatePath("/overview")
  return { ok: true }
}

/**
 * Creates a new project + its first API key. Returns the raw key ONCE (only the
 * SHA-256 hash is stored). The user pastes it into .bob/mcp.json.
 */
export async function createProject(
  name: string,
  baseUrl: string,
): Promise<{ ok: boolean; apiKey?: string; message?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, message: "Project name is required." }
  const url = baseUrl.trim() || "http://localhost:5173"

  const now = new Date().toISOString()
  const projectId = `project:${randomUUID()}`
  const rawKey = newRawKey()

  const project: Project = {
    _id: projectId,
    type: "project",
    ownerId: "user:system",
    name: trimmed,
    baseUrl: url,
    createdAt: now,
  }
  const apiKey: ApiKey = {
    _id: `apiKey:${randomUUID()}`,
    type: "apiKey",
    projectId,
    hash: hashKey(rawKey),
    prefix: rawKey.slice(0, 16),
    revoked: false,
    createdAt: now,
  }

  await putDoc(project)
  await putDoc(apiKey)
  revalidatePath("/projects")
  return { ok: true, apiKey: rawKey }
}

/**
 * Rotates a project's API key: mints a new raw key, replaces the stored hash, and
 * returns the new key ONCE. The old key stops working immediately.
 */
export async function rotateApiKey(
  projectId: string,
): Promise<{ ok: boolean; apiKey?: string; message?: string }> {
  const keys = await find<ApiKey>({ type: "apiKey", projectId }, { limit: 1 })
  const keyDoc = keys[0]
  if (!keyDoc) return { ok: false, message: "No API key found for this project." }

  const rawKey = newRawKey()
  await putDoc<ApiKey>({
    ...keyDoc,
    hash: hashKey(rawKey),
    prefix: rawKey.slice(0, 16),
    revoked: false,
  })
  revalidatePath("/projects")
  return { ok: true, apiKey: rawKey }
}

/**
 * Permanently deletes a project and EVERYTHING scoped to it: its API key, runs,
 * results, tickets, events, plans, and specs. Irreversible.
 */
export async function deleteProject(
  projectId: string,
): Promise<{ ok: boolean; deleted?: number; message?: string }> {
  const c = cloudant()
  const res = await c.postAllDocs({ db: DB_NAME, includeDocs: true, limit: 100000 })

  const toDelete = res.result.rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r) => r.doc as any)
    .filter(
      (d) =>
        d &&
        !String(d._id).startsWith("_design/") &&
        (d._id === projectId || d.projectId === projectId),
    )
    .map((d) => ({ _id: d._id, _rev: d._rev, _deleted: true }))

  if (toDelete.length > 0) {
    await c.postBulkDocs({ db: DB_NAME, bulkDocs: { docs: toDelete } })
  }

  revalidatePath("/projects")
  revalidatePath("/board")
  revalidatePath("/overview")
  return { ok: true, deleted: toDelete.length }
}
