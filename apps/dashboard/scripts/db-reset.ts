#!/usr/bin/env tsx
/**
 * scripts/db-reset.ts
 *
 * Wipes all run data (runs, results, tickets, events, plans, specs, reports) from
 * Cloudant so the board is empty for a fresh demo — but KEEPS the user, project,
 * and apiKey docs, so the MCP can still authenticate.
 *
 *   npm run db:reset
 */

import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })
import { cloudant, DB_NAME } from "../lib/cloudant"

// By default keep the auth docs; RESET_ALL=1 wipes everything (then re-seed).
const KEEP = process.env.RESET_ALL ? new Set<string>() : new Set(["user", "project", "apiKey"])

async function main() {
  const c = cloudant()
  const res = await c.postAllDocs({ db: DB_NAME, includeDocs: true, limit: 100000 })

  const toDelete = res.result.rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r) => r.doc as any)
    .filter((d) => d && !String(d._id).startsWith("_design/") && !KEEP.has(d.type))
    .map((d) => ({ _id: d._id, _rev: d._rev, _deleted: true }))

  if (toDelete.length === 0) {
    console.log("[reset] Nothing to delete — the board is already clean.")
    return
  }

  await c.postBulkDocs({ db: DB_NAME, bulkDocs: { docs: toDelete } })
  console.log(`[reset] Deleted ${toDelete.length} docs. Kept user / project / apiKey.`)
}

main().then(() => process.exit(0)).catch((e: unknown) => {
  console.error("[reset] Fatal:", (e as { message?: string })?.message ?? e)
  process.exit(1)
})
