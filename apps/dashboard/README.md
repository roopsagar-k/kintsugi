# Kintsugi dashboard

The Next.js 16 dashboard **and** REST API for Kintsugi. It exposes the API the MCP
server posts to, and renders a live Kanban board of triaged failure tickets — backed
by **IBM Cloudant** (data), **IBM Cloud Object Storage** (screenshots), and
**IBM watsonx.ai** (triage).

## Setup

### 1. Environment
```bash
cp .env.example .env.local
```
Fill in the values (see `.env.example` for where to find each in IBM Cloud):

| Variable | Required | Description |
|---|---|---|
| `CLOUDANT_URL`, `CLOUDANT_APIKEY` | ✅ | IBM Cloudant service URL + IAM key |
| `CLOUDANT_DB` | optional | Database name (default `kintsugi`) |
| `COS_ENDPOINT`, `COS_BUCKET`, `COS_APIKEY`, `COS_INSTANCE_CRN` | optional | IBM COS bucket for media (falls back to Cloudant attachments) |
| `WATSONX_URL`, `WATSONX_APIKEY`, `WATSONX_PROJECT_ID` | optional | watsonx.ai for AI triage (falls back to heuristics) |
| `WATSONX_MODEL` | optional | Chat model id (default `ibm/granite-4-h-small`) |
| `APP_URL` | optional | Base URL for links (default `http://localhost:3000`) |

### 2. Create the database + a demo API key
```bash
npm run db:setup    # create the Cloudant DB + Mango indexes (safe to re-run)
npm run db:seed     # create a demo project + API key (prints the key once)
```
Copy the printed `KINTSUGI_API_KEY` into `.bob/mcp.json` so the MCP can authenticate.

### 3. Run
```bash
npm run dev         # http://localhost:3000
```

## What's inside

```
app/
  api/v1/          REST API the MCP posts to (auth, plans, runs, results, tickets,
                   failures, artifacts, reports, events) — see app/api/README.md
  (dashboard)/     the UI: overview, board (Kanban), runs, projects, settings
lib/
  cloudant.ts      Cloudant client + query helpers
  storage.ts       IBM COS media storage (signed URLs / streaming)
  triage.ts        watsonx.ai chat triage (heuristic fallback)
  auth.ts          MCP API-key verification (SHA-256)
  dashboard-data.ts server-side reads for the UI (bypasses the API, reads Cloudant)
  mock-data.ts     demo data / UI types
```

## Data flow
- **The MCP → API**: authenticated by a hashed API key; posts runs, results (which
  auto-raise triaged tickets), and uploads screenshots to COS.
- **The UI → Cloudant**: dashboard pages are server components that read Cloudant
  directly via `lib/dashboard-data.ts` (no API key needed server-side).

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:setup` | Create DB + indexes |
| `npm run db:seed` | Seed a demo project + API key |
| `npm run lint` | ESLint |
