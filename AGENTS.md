# AGENTS.md — Kintsugi

Project-wide rules for IBM Bob. Kintsugi turns Bob into an autonomous QA engineer:
Bob writes Playwright E2E specs, the **Kintsugi MCP server** runs them in a real
browser, failures become triaged Kanban tickets, and Bob heals the app code and
re-tests until green.

## How Kintsugi runs (read this first)

- Playwright is executed **only** by the Kintsugi MCP server, never by a shell.
  Call it with `use_mcp_tool`, `server_name: "kintsugi"`. Neither QA mode has the
  `command` (execute) group — that is deliberate.
- Every Kintsugi MCP tool takes an absolute **`projectRoot`** — pass the workspace
  root path.
- The server runs in `local` mode (`.bob/mcp.json`): state and tickets live under
  `.kintsugi/.local/`. There is no cloud dashboard yet.
- Two modes and their skills:
  - **kintsugi-qa** (`/qa-init`, `/qa-run`) — plan/write/run tests; edits only
    `.kintsugi/tests/**`.
  - **kintsugi-healer** (`/qa-heal`) — fix app code and re-verify; cannot edit
    `.kintsugi/tests/**`.
  - `/qa-report` summarises the latest run and the ticket board.

## Non-negotiable rules

1. **Never delete, skip, loosen, or comment out a failing assertion** to make a
   test pass. A failing test is a finding. Fix the product, not the test.
2. **Tests live under `.kintsugi/tests/<lane>/`** and import `{ test, expect }`
   from `../fixtures` (auto-captures console errors + failed requests for triage).
3. **Heal loop:** move a ticket to `InProgress` before fixing; `Done` only when
   `rerun_test` passes; after **3 failed attempts** set it to `NeedsHuman` with a
   note. One ticket at a time; smallest correct fix.
4. **Prefer `data-testid`** (then ARIA role/name) selectors over brittle CSS/text.
5. **Never print, log, or commit secrets.** `.env*` and any real API keys stay out
   of the repo and out of tool output. Kintsugi credentials
   (`KINTSUGI_*_API_KEY`) come from `.bob/mcp.json` env, never from source.
6. **Ticket statuses:** `Backlog`, `InProgress`, `InReview`, `Done`, `NeedsHuman`.

## Repo layout (relevant paths)

```
.bob/
  mcp.json                 # registers the "kintsugi" MCP server (local mode)
  custom_modes.yaml        # kintsugi-qa + kintsugi-healer
  rules-kintsugi-qa/       # QA mode rules
  rules-kintsugi-healer/   # healer mode rules
  skills/                  # /qa-init /qa-run /qa-heal /qa-report + qa-test-writer
mcp/                       # the Kintsugi MCP server (TypeScript; build → dist/)
.kintsugi/                 # created by init_project in the app under test
docs/                      # mcp-plan.md, api-contract.md
```