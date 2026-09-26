# Kintsugi — an autonomous QA engineer for IBM Bob

> *Kintsugi (金継ぎ)* — the Japanese art of repairing broken pottery with gold. Kintsugi
> finds the cracks in your app and mends them.

Kintsugi turns **IBM Bob** into an autonomous QA engineer. Bob reads a codebase, writes
Playwright end-to-end tests, runs them in a real browser through the **Kintsugi MCP
server**, and every failure becomes a **triaged Kanban ticket** on a live dashboard.
Bob then heals the application code and re-tests until the suite is green.

Built for the **IBM Bob 2.0 Hackathon** on the IBM stack: **watsonx.ai** (triage),
**IBM Cloudant** (data), and **IBM Cloud Object Storage** (evidence).

---

## The loop

```
  Bob (kintsugi-qa mode)                 Kintsugi MCP server           Cloud (dashboard)         IBM
 ────────────────────────────────────────┼──────────────────────────────┼────────────────────────┼──────────
  /qa-run                                 │                              │                        │
    init_project ────────────────────────►│ scaffold .kintsugi/          │                        │
    analyze_app ─────────────────────────►│ headless crawl → route map   │                        │
    save_test_plan ──────────────────────►│─────────────────────────────►│ plan (Cloudant)        │
    [subagents write specs]               │                              │                        │
    run_tests ───────────────────────────►│ spawn Playwright             │                        │
                                          │  ├─ test fails → screenshot   │                        │
                                          │  └─ post result ─────────────►│ POST /results          │
                                          │                              │   ├─ triage ───────────┼──► watsonx.ai
                                          │                              │   ├─ upload screenshot ─┼──► COS bucket
                                          │                              │   └─ raise ticket ─────┼──► Cloudant
    get_failures ◄───────────────────────┼──────────────────────────────┤ failures + triage      │
  /qa-heal  (kintsugi-healer mode)        │                              │                        │
    get_ticket → fix code → rerun_test ──►│ re-run one test → green ─────►│ ticket → Done          │
```

The result is a live Kanban board where failures appear as tickets — AI-triaged, with a
severity, a root cause, suspected files, and a screenshot — that Bob then heals.

---

## Repository layout

```
kintsugi/
├── mcp/                  # Kintsugi MCP server (TypeScript, stdio + Streamable HTTP)
│   ├── src/              #   tools, Playwright runner, triage, local + cloud stores
│   └── reporter/         #   Playwright reporter (NDJSON bridge)
├── apps/dashboard/       # Next.js 16 dashboard + REST API (Cloudant, COS, watsonx)
│   ├── app/api/v1/       #   route handlers
│   ├── app/(dashboard)/  #   Kanban board, overview, runs, projects, settings
│   └── lib/              #   cloudant, storage (COS), triage (watsonx), auth
├── demo/shoplite/        # Demo storefront (Vite + React) with 5 seeded bugs
├── .bob/                 # Bob integration: modes, rules, skills, MCP config
└── docs/                 # architecture, API contract, MCP plan
```

---

## Tech stack

| Layer | Choice |
|---|---|
| MCP server | TypeScript, `@modelcontextprotocol/sdk`, Playwright, Zod |
| Dashboard + API | Next.js 16 (App Router), Tailwind v4, shadcn/ui, dnd-kit, Recharts |
| Database | **IBM Cloudant** (`@ibm-cloud/cloudant`) |
| Media / evidence | **IBM Cloud Object Storage** (`ibm-cos-sdk`) — falls back to Cloudant attachments |
| AI triage | **IBM watsonx.ai** (`@ibm-cloud/watsonx-ai`, Granite) — heuristic fallback |
| Auth | Bob→API: hashed API keys · Dashboard: Auth.js (planned) |

---

## Setup

### Prerequisites
- Node.js 20+ · IBM Bob 2.0.2+ · an IBM Cloud account (Cloudant, COS, watsonx.ai)

### 1. Build the MCP server
```bash
cd mcp && npm install && npm run build
```

### 2. Dashboard + IBM services
```bash
cd apps/dashboard && npm install
cp .env.example .env.local     # fill in Cloudant / COS / watsonx creds
npm run db:setup               # create the Cloudant DB + indexes
npm run db:seed                # create a demo project + API key (prints the key once)
npm run dev                    # dashboard + API at http://localhost:3000
```
See [`apps/dashboard/.env.example`](apps/dashboard/.env.example) for exactly which
credentials to create in IBM Cloud and where to find each one.

### 3. Point Bob at the MCP server
```bash
cp .bob/mock-mcp.json .bob/mcp.json
```
Edit `.bob/mcp.json`: set the absolute path to `mcp/dist/index.js`, paste the
`KINTSUGI_API_KEY` from `db:seed`, and choose `KINTSUGI_MODE`:
- `local` — self-contained; state in `.kintsugi/.local/` (no cloud needed)
- `cloud` — posts to the dashboard API (Cloudant + COS + watsonx)

`.bob/mcp.json` holds a secret and is **gitignored** — only `.bob/mock-mcp.json` is committed.

---

## Run it

In Bob, open the project you want to test and run **`/qa-run`** (kintsugi-qa mode). Bob
plans, writes specs, and runs them; failures appear as tickets. Then run **`/qa-heal`**
(kintsugi-healer mode) to fix them. See [`.bob/README.md`](.bob/README.md) for the modes,
skills, and commands.

### Demo target — ShopLite
[`demo/shoplite/`](demo/shoplite/) is a small storefront with **5 seeded bugs** (missing
auth guard, checkout accepts an empty email, cart quantity-zero, mobile add-to-cart
hidden, a product-page console error). Running `/qa-run` against it produces 5 triaged
tickets — the full demo.

---

## Security

Kintsugi follows the [IBM Hackathon security template](https://github.com/watsonxhackathon/ibm-hackathon-template) — see **[SECURITY.MD](SECURITY.MD)** for the full guidelines.

- **All credentials live in environment variables**, never in code. Real secrets are in
  `apps/dashboard/.env.local` and `.bob/mcp.json` — both **gitignored**. Only the
  placeholder `.env.example` and `.bob/mock-mcp.json` are committed.
- `.gitignore` and `.bobignore` block `.env*`, private keys, and any
  credential/secret/token-named files from being committed or logged by Bob.
- API keys are stored only as a **SHA-256 hash**; the raw `kts_live_…` key is shown once.
- Before pushing publicly, **rotate the MCP key** (Projects page) and review `git diff`.
  Committing a real IBM credential can suspend your IBM Cloud account.

---

## Documentation
- [`docs/`](docs/) — architecture, API contract, MCP build plan
- [`mcp/README.md`](mcp/README.md) — MCP server, tools, env vars
- [`apps/dashboard/app/api/README.md`](apps/dashboard/app/api/README.md) — API endpoints
- [`.bob/README.md`](.bob/README.md) — Bob modes, skills, and slash commands
