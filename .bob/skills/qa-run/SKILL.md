---
name: qa-run
description: Use when the user wants to QA-test a web app end-to-end, add E2E coverage, or run the Kintsugi QA loop (e.g. "/qa-run", "test this app", "write and run E2E tests"). Plans, writes, and runs Playwright specs through the Kintsugi MCP and opens tickets for failures.
---

# /qa-run — plan, write, and run the E2E suite

Drives the full Kintsugi QA cycle through the `kintsugi` MCP server. All MCP calls
use `use_mcp_tool` with `server_name: "kintsugi"` and an absolute `projectRoot`
(the current workspace root).

## Steps

1. **Switch mode.** `switch_mode` to `kintsugi-qa`. (You have no shell in this
   mode; Playwright runs only via the MCP.)

2. **Initialise the workspace.** Call `init_project` with `projectRoot`, the app's
   `baseUrl` (ask the user if unknown, e.g. `http://localhost:3000`), and
   `startCommand` if the app isn't already running.
   - If it returns `ready: false` with `installCommands`, relay those commands to
     the user to run (you cannot run them), then stop until the app + Playwright
     are installed.

3. **Understand the app.** Ask the user what to cover: whole app / one feature /
   from an attached PRD / only changed areas. Then call `analyze_app`
   (`maxPages` ≤ 10) to get the route map: pages, forms, buttons, links, console
   errors.

4. **Plan.** From the route map, design lane-based test cases (`ui`, `api`,
   `auth`, `edge`, `visual`). Call `save_test_plan` (`source: "bob-qa-v1"`,
   `lanes: [...]`) and keep the returned `planId`.

5. **Write specs — one subagent per lane.** Use `spawn_subagent` (mode
   `kintsugi-qa`) per lane so lanes are written in parallel. Each subagent writes
   `.kintsugi/tests/<lane>/<feature>.spec.ts`, importing `{ test, expect }` from
   `../fixtures`, following the **qa-test-writer** skill's conventions. The spec
   files on disk are the handoff — there is no "save specs" MCP tool.

6. **Run.** Call `run_tests` with `projectRoot`, the `planId`, and the `lanes` you
   wrote. If it returns `status: "running"`, call `get_run_status(runId)`
   **immediately** and repeat until `status: "done"` (it blocks server-side —
   don't sleep).

7. **Report failures.** If `failed > 0`, call `get_failures(runId)` and summarise
   each failure: title, severity, likely cause, suspected files. Tickets are
   auto-created in the Backlog. Then tell the user to run **`/qa-heal`** to fix
   them. If everything passed, say so and offer `/qa-report`.

## Notes
- Keep MCP outputs compact; large evidence stays on disk (paths/URLs returned).
- Never weaken a test to make it pass — a failure is a finding.
- Detailed guardrails: `.bob/rules-kintsugi-qa/` and `AGENTS.md`.
