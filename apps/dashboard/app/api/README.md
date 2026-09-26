# Kintsugi API — route handlers

Next.js 16 App Router route handlers for the Kintsugi cloud API. The scaffolding
(routing, input validation, API-key auth, response shapes, Cloudant client, and
shared types) is in place. The **persistence and business logic** is marked with
`TODO(bob)` in each handler for implementation in IBM Bob.

## Layout

```
app/api/v1/
  auth/verify/route.ts          GET     verify API key → projectId
  plans/route.ts                POST    save a test plan
  runs/route.ts                 POST    open a run
  runs/[id]/route.ts            GET     run status
                                PATCH   update run status/counts
  runs/[id]/results/route.ts    POST    post a test result (+ auto-ticket on fail)
  runs/[id]/failures/route.ts   GET     failures + triage for a run
  tickets/route.ts              GET     Kanban board (filter by status)
  tickets/[id]/route.ts         GET     ticket detail
                                PATCH   move status / note / fixDiff
  artifacts/route.ts            POST    upload evidence (Cloudant attachment)
  reports/route.ts              POST    generate a run report
  events/route.ts               GET     live-update feed (dashboard polls ?since=)
```

## Supporting lib
- `lib/types.ts` — all domain types (mirrors the Cloudant data model)
- `lib/schemas.ts` — Zod request validation
- `lib/cloudant.ts` — `@ibm-cloud/cloudant` client + `getDoc`/`putDoc`/`find` helpers
- `lib/auth.ts` — `verifyApiKey` (Bearer → SHA-256 → project lookup)
- `lib/http.ts` — `ok`/`created`/`badRequest`/`unauthorized`/`notFound`/`notImplemented`

## TODO(bob) checklist
1. `lib/auth.ts` — Cloudant lookup of the `apiKey` doc by hash (revoked check, `lastUsedAt`).
2. `lib/cloudant.ts` — create Mango indexes for `{type,projectId}`, `{type,runId}`, `{type,status}`.
3. Each route's `TODO(bob)` — the read/write against Cloudant and the success response.
4. Auto-ticket + triage in `runs/[id]/results` (watsonx via the shared triage module).
5. Cloudant attachment storage + a `GET /api/v1/artifacts/:id` streamer.
6. Auth.js (NextAuth v5) config for the dashboard UI (GitHub + demo credentials).

Every handler currently returns `501 not_implemented` until its TODO is filled.
