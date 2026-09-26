/**
 * lib/events.ts
 *
 * Thin helper for appending `event` documents to Cloudant.
 * Every meaningful state change (run.started, result.posted, ticket.created,
 * ticket.moved) calls appendEvent so the /events feed stays current.
 */

import { randomUUID } from "node:crypto"
import { putDoc } from "./cloudant"
import type { Event } from "./types"

export async function appendEvent(
  projectId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const doc: Event = {
    _id: `event:${randomUUID()}`,
    type: "event",
    projectId,
    ts: new Date().toISOString(),
    kind,
    payload,
  }
  await putDoc(doc).catch(() => {
    // Fire-and-forget — event failures must not break the primary operation.
  })
}
