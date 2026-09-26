import { CloudantV1 } from "@ibm-cloud/cloudant"
import { IamAuthenticator } from "ibm-cloud-sdk-core"
import type { CloudantV1 as CV1 } from "@ibm-cloud/cloudant"

// IBM Cloudant client factory. Reads credentials from the environment:
//   CLOUDANT_URL     — service URL, e.g. https://<host>.cloudantnosqldb.appdomain.cloud
//   CLOUDANT_APIKEY  — IAM API key for the service instance
//   CLOUDANT_DB      — database name (defaults to "kintsugi")
//
// The whole app uses ONE partitioned database keyed by projectId, with a `type`
// field discriminating the 10 document kinds (see lib/types.ts).

export const DB_NAME = process.env.CLOUDANT_DB ?? "kintsugi"

let client: CloudantV1 | null = null

/** Returns a memoised Cloudant client built from env credentials. */
export function cloudant(): CloudantV1 {
  if (client) return client

  const url = process.env.CLOUDANT_URL
  const apikey = process.env.CLOUDANT_APIKEY
  if (!url || !apikey) {
    throw new Error("Cloudant is not configured: set CLOUDANT_URL and CLOUDANT_APIKEY.")
  }

  client = new CloudantV1({
    authenticator: new IamAuthenticator({ apikey }),
    serviceUrl: url,
  })
  return client
}

// ── Thin typed helpers ─────────────────────────────────────────────────────────

/** Fetch a single document by _id. Returns null on 404. */
export async function getDoc<T>(id: string): Promise<T | null> {
  try {
    const res = await cloudant().getDocument({ db: DB_NAME, docId: id })
    return res.result as unknown as T
  } catch (err: unknown) {
    if (isNotFound(err)) return null
    throw err
  }
}

/** Create or update a document. Cloudant assigns _rev; pass it back on updates. */
export async function putDoc<T extends { _id: string }>(doc: T): Promise<{ id: string; rev?: string }> {
  const res = await cloudant().postDocument({ db: DB_NAME, document: doc as Record<string, unknown> })
  return { id: res.result.id, rev: res.result.rev }
}

/**
 * Run a Mango (_find) query. Callers pass the selector/index.
 */
export async function find<T>(selector: Record<string, unknown>, options?: {
  sort?: Array<Record<string, "asc" | "desc">>
  limit?: number
}): Promise<T[]> {
  const res = await cloudant().postFind({
    db: DB_NAME,
    selector,
    sort: options?.sort,
    limit: options?.limit ?? 200,
  })
  return res.result.docs as unknown as T[]
}

/** Store a binary attachment on a Cloudant document (creates the doc first if missing). */
export async function putAttachment(params: {
  docId: string
  attName: string
  data: Buffer
  contentType: string
}): Promise<{ id: string; rev: string }> {
  // Ensure host doc exists (may already exist from a previous call).
  let rev: string | undefined
  try {
    const existing = await cloudant().getDocument({ db: DB_NAME, docId: params.docId })
    rev = existing.result._rev as string | undefined
  } catch (err: unknown) {
    if (!isNotFound(err)) throw err
    // Create host document
    const created = await cloudant().postDocument({
      db: DB_NAME,
      document: { _id: params.docId, type: "artifact" } as Record<string, unknown>,
    })
    rev = created.result.rev as string | undefined
  }

  const res = await cloudant().putAttachment({
    db: DB_NAME,
    docId: params.docId,
    attachmentName: params.attName,
    attachment: params.data,
    contentType: params.contentType,
    rev: rev ?? "",
  })
  return { id: res.result.id, rev: res.result.rev as string }
}

/** Retrieve a Cloudant attachment as a Buffer. Returns null if the doc/attachment is missing. */
export async function getAttachment(docId: string, attName: string): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    const res = await cloudant().getAttachment({
      db: DB_NAME,
      docId,
      attachmentName: attName,
    })
    const buf = Buffer.isBuffer(res.result)
      ? res.result
      : Buffer.from(await (res.result as NodeJS.ReadableStream & { read(): Buffer | null }).read() ?? [])
    const ct = (res as unknown as { headers?: Record<string, string> }).headers?.["content-type"] ?? "application/octet-stream"
    return { data: buf, contentType: ct }
  } catch (err: unknown) {
    if (isNotFound(err)) return null
    throw err
  }
}

/**
 * Create a single Mango index. Safe to call repeatedly — Cloudant is idempotent
 * when the index name matches.
 */
export async function ensureIndex(fields: string[], name: string): Promise<void> {
  // Cloudant SDK expects IndexField objects (or plain strings coerced via unknown).
  const indexFields = fields as unknown as CV1.IndexField[]
  await cloudant().postIndex({
    db: DB_NAME,
    index: { fields: indexFields },
    name,
    type: "json",
    ddoc: `idx-${name}`,
  })
}

/**
 * Create the kintsugi DB (if absent) and ensure all Mango indexes exist.
 * Call from scripts/setup-db.ts or on cold start.
 */
export async function setupDb(): Promise<void> {
  const db = cloudant()

  // Create DB if missing.
  try {
    await db.putDatabase({ db: DB_NAME })
    console.log(`[setup] Created database "${DB_NAME}".`)
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 412) {
      console.log(`[setup] Database "${DB_NAME}" already exists.`)
    } else {
      throw err
    }
  }

  // Mango indexes needed by the queries across the API routes.
  const indexes: Array<[string[], string]> = [
    [["type", "projectId"], "type-projectId"],
    [["type", "runId"], "type-runId"],
    [["type", "status"], "type-status"],
    [["type", "ts"], "type-ts"],
    [["type", "hash"], "type-hash"],
    [["type", "projectId", "status"], "type-projectId-status"],
    [["type", "projectId", "ts"], "type-projectId-ts"],
    [["type", "runId", "testId", "retryIndex"], "type-runId-testId-retryIndex"],
    [["type", "projectId", "severity"], "type-projectId-severity"],
  ]

  for (const [fields, name] of indexes) {
    await ensureIndex(fields, name)
    console.log(`[setup] Index "${name}" ensured.`)
  }

  console.log("[setup] Done.")
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { status?: number }).status === 404
}
