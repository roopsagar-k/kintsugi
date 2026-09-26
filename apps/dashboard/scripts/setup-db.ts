#!/usr/bin/env tsx
/**
 * scripts/setup-db.ts
 *
 * Creates the `kintsugi` Cloudant database and all required Mango indexes.
 * Run once before first use (or after a wipe):
 *
 *   npm run db:setup
 *
 * Requires CLOUDANT_URL and CLOUDANT_APIKEY to be set in the environment
 * (copy .env.example → .env.local and fill in, or export directly).
 */

import { config } from "dotenv"
// Load Next-style env files; .env.local wins (dotenv won't override already-set vars).
config({ path: ".env.local" })
config({ path: ".env" })
import { setupDb } from "../lib/cloudant"

setupDb()
  .then(() => {
    process.exit(0)
  })
  .catch((err: unknown) => {
    console.error("[setup] Fatal:", err)
    process.exit(1)
  })
