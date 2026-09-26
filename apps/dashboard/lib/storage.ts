// Media storage abstraction. Primary: IBM Cloud Object Storage (S3-compatible
// buckets) via ibm-cos-sdk. Fallback: Cloudant attachments (so the API works even
// before a bucket is provisioned).
//
// Env (see .env.example):
//   COS_ENDPOINT   — e.g. https://s3.us-south.cloud-object-storage.appdomain.cloud
//   COS_BUCKET     — bucket name
//   IAM auth:  COS_APIKEY + COS_INSTANCE_CRN
//   or HMAC:   COS_ACCESS_KEY_ID + COS_SECRET_ACCESS_KEY

import { putAttachment, getAttachment } from "./cloudant"

export function cosConfigured(): boolean {
  return Boolean(
    process.env.COS_ENDPOINT &&
      process.env.COS_BUCKET &&
      (process.env.COS_APIKEY || process.env.COS_ACCESS_KEY_ID),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let s3: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cos(): Promise<any> {
  if (s3) return s3
  const mod = await import("ibm-cos-sdk")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const COS = (mod as any).default ?? mod
  s3 = process.env.COS_APIKEY
    ? new COS.S3({
        endpoint: process.env.COS_ENDPOINT,
        apiKeyId: process.env.COS_APIKEY,
        serviceInstanceId: process.env.COS_INSTANCE_CRN,
        signatureVersion: "iam",
      })
    : new COS.S3({
        endpoint: process.env.COS_ENDPOINT,
        accessKeyId: process.env.COS_ACCESS_KEY_ID,
        secretAccessKey: process.env.COS_SECRET_ACCESS_KEY,
      })
  return s3
}

const fallbackDocId = (key: string) => `media:${key.replace(/\//g, ":")}`
const fallbackAttName = (key: string) => key.split("/").pop() ?? "file"

/** Store a media object under `key` (e.g. "proj/run/test/screenshot.png"). */
export async function storeMedia(key: string, data: Buffer, contentType: string): Promise<void> {
  if (cosConfigured()) {
    const client = await cos()
    await client
      .putObject({ Bucket: process.env.COS_BUCKET, Key: key, Body: data, ContentType: contentType })
      .promise()
    return
  }
  await putAttachment({ docId: fallbackDocId(key), attName: fallbackAttName(key), data, contentType })
}

/** Fetch a media object. Returns null if absent. */
export async function getMedia(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (cosConfigured()) {
    const client = await cos()
    try {
      const res = await client.getObject({ Bucket: process.env.COS_BUCKET, Key: key }).promise()
      return {
        data: res.Body as Buffer,
        contentType: (res.ContentType as string) ?? "application/octet-stream",
      }
    } catch {
      return null
    }
  }
  return getAttachment(fallbackDocId(key), fallbackAttName(key))
}

/**
 * A time-limited signed GET URL for a stored object. Returns null when COS isn't
 * configured OR when the credentials can't presign (IAM auth can't — only HMAC /
 * SigV4 keys can). Callers fall back to streaming via getMedia() in that case.
 * To enable signed-URL offloading, add an HMAC credential (COS_ACCESS_KEY_ID /
 * COS_SECRET_ACCESS_KEY).
 */
export async function signedMediaUrl(key: string, expiresSeconds = 3600): Promise<string | null> {
  if (!cosConfigured()) return null
  try {
    const client = await cos()
    return client.getSignedUrl("getObject", {
      Bucket: process.env.COS_BUCKET,
      Key: key,
      Expires: expiresSeconds,
    }) as string
  } catch {
    return null
  }
}
