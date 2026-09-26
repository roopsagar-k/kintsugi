---
name: qa-heal
description: Use when the user wants to fix failing tests/tickets found by Kintsugi, self-heal reported bugs, or run the heal loop (e.g. "/qa-heal", "fix the failing tests", "heal the tickets"). Diagnoses and fixes application code, then re-verifies through the MCP.
---

# /qa-heal — fix failing tickets and re-verify

Fixes the application code behind Kintsugi tickets and re-runs each test until
green. All MCP calls use `use_mcp_tool` with `server_name: "kintsugi"` and an
absolute `projectRoot`.

## Steps

1. **Switch mode.** `switch_mode` to `kintsugi-healer`. (In this mode you can edit
   app source but NOT anything under `.kintsugi/tests/`, and you have no shell.)

2. **Pick work.** Call `list_tickets({ status: "Backlog" })` (optionally also
   `NeedsHuman` if the user asks). Fix highest severity first
   (critical → high → medium → low). If the user named a specific ticket, use it.

3. **For each ticket, run the heal loop (max 3 attempts):**
   a. `get_ticket(ticketId)` — read triage, error, console/network evidence, and
      `suspectedFiles`.
   b. `update_ticket(ticketId, { status: "InProgress" })` before editing.
   c. `read_file` the suspected files, form a hypothesis, and apply the smallest
      correct fix to the **application source** (`apply_diff` / `write_file`).
   d. `rerun_test(ticketId)` to re-run just that test via the MCP.
      - **Pass** → the MCP moves the ticket to `Done`; add a short note (and
        `fixDiff` if useful) via `update_ticket`. Move to the next ticket.
      - **Fail** → refine and repeat, up to 3 attempts total.
   e. After 3 failed attempts: `update_ticket(ticketId, { status: "NeedsHuman",
      note: "<what you tried and why it failed>" })` and move on.

4. **Wrap up.** Report how many tickets went to `Done` vs `NeedsHuman`. Suggest
   `/qa-report` for a summary, or `/qa-run` to re-run the full suite.

## Rules
- Fix the product, never the test. Never disable/weaken/skip a test, edit
  fixtures, or change the Playwright config to dodge a failure.
- One ticket at a time; smallest change that makes it pass.
- Full guardrails: `.bob/rules-kintsugi-healer/` and `AGENTS.md`.
