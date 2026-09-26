#!/usr/bin/env tsx
/**
 * scripts/cos-clear.ts
 *
 * Deletes ALL objects from the IBM Cloud Object Storage evidence bucket
 * (screenshots, videos, traces, diffs) so artifacts don't accumulate between
 * demo runs. The bucket is single-tenant for Kintsugi evidence, so this clears
 * everything. Cloudant docs are untouched — run `npm run db:reset` for those.
 *
 *   npm run storage:clear
 */

import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const bucket = process.env.COS_BUCKET
  const endpoint = process.env.COS_ENDPOINT
  const hasCreds = Boolean(process.env.COS_APIKEY || process.env.COS_ACCESS_KEY_ID)
  if (!bucket || !endpoint || !hasCreds) {
    console.log(
      "[cos-clear] COS not configured (COS_BUCKET / COS_ENDPOINT / credentials missing). Nothing to do.",
    )
    return
  }

  const mod = await import("ibm-cos-sdk")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const COS = (mod as any).default ?? mod
  const s3 = process.env.COS_APIKEY
    ? new COS.S3({
        endpoint,
        apiKeyId: process.env.COS_APIKEY,
        serviceInstanceId: process.env.COS_INSTANCE_CRN,
        signatureVersion: "iam",
      })
    : new COS.S3({
        endpoint,
        accessKeyId: process.env.COS_ACCESS_KEY_ID,
        secretAccessKey: process.env.COS_SECRET_ACCESS_KEY,
      })

  let token: string | undefined
  let total = 0
  do {
    const res = await s3
      .listObjectsV2({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 })
      .promise()
    const objects = (res.Contents ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => ({ Key: o.Key as string }))
      .filter((o: { Key?: string }) => Boolean(o.Key))
    if (objects.length > 0) {
      await s3.deleteObjects({ Bucket: bucket, Delete: { Objects: objects } }).promise()
      total += objects.length
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)

  console.log(`[cos-clear] Deleted ${total} object(s) from bucket "${bucket}".`)
}

main().catch((e) => {
  console.error("[cos-clear] failed:", e)
  process.exit(1)
})
