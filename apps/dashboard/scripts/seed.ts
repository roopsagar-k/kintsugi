#!/usr/bin/env tsx
/**
 * scripts/seed.ts
 *
 * Seeds a demo user, project, and API key so the API (and the MCP) can
 * authenticate. Run AFTER `npm run db:setup`:
 *
 *   npm run db:seed
 *
 * The raw API key is printed ONCE — copy it into the Kintsugi MCP's
 * `.bob/mcp.json` env as KINTSUGI_API_KEY. Only its SHA-256 hash is stored.
 */

import { config } from "dotenv"
// Load Next-style env files; .env.local wins (dotenv won't override already-set vars).
config({ path: ".env.local" })
config({ path: ".env" })
import { randomBytes, randomUUID } from "node:crypto"
import { putDoc } from "../lib/cloudant"
import { hashKey } from "../lib/auth"
import type { ApiKey, Project, User } from "../lib/types"

async function seed() {
  const now = new Date().toISOString()

  const userId = `user:${randomUUID()}`
  const projectId = `project:${randomUUID()}`
  const keyId = `apiKey:${randomUUID()}`
  const rawKey = `kts_live_${randomBytes(24).toString("hex")}`

  const user: User = {
    _id: userId,
    type: "user",
    email: "demo@kintsugi.dev",
    name: "Demo User",
    createdAt: now,
  }

  const project: Project = {
    _id: projectId,
    type: "project",
    ownerId: userId,
    name: "ShopLite",
    baseUrl: "http://localhost:5173",
    createdAt: now,
  }

  const apiKey: ApiKey = {
    _id: keyId,
    type: "apiKey",
    projectId,
    hash: hashKey(rawKey),
    prefix: rawKey.slice(0, 16),
    revoked: false,
    createdAt: now,
  }

  await putDoc(user)
  await putDoc(project)
  await putDoc(apiKey)

  console.log("\n✅ Seeded demo data:\n")
  console.log("  projectId :", projectId)
  console.log("  project   : ShopLite (http://localhost:5173)")
  console.log("\n🔑 API key (shown once — put in .bob/mcp.json as KINTSUGI_API_KEY):\n")
  console.log("  " + rawKey + "\n")
}

seed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("[seed] Fatal:", err)
    process.exit(1)
  })
