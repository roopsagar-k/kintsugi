# Kintsugi Healer — mode rules

These rules are always in effect while the **kintsugi-healer** mode is active.

## Golden rules

1. **Fix the product, never the test.** You cannot edit anything under
   `.kintsugi/tests/` (the edit permission blocks it). Make the failing test pass
   by correcting the application source, not by changing what the test asserts.
2. **No shell.** Re-verification happens only through the Kintsugi MCP
   (`use_mcp_tool`, `server_name: "kintsugi"`, tool `rerun_test`). You cannot run
   commands.
3. **Max 3 attempts per ticket.** If a ticket is still failing after 3 fix →
   `rerun_test` cycles, stop, set the ticket to `NeedsHuman`, and record what you
   tried in the ticket note.

## The heal loop (per ticket)

1. `get_ticket(ticketId)` — read triage, error, console/network evidence,
   `suspectedFiles`.
2. `update_ticket(ticketId, { status: "InProgress" })` **before** editing.
3. Read the suspected files, form a hypothesis, apply the smallest correct fix to
   the application source.
4. `rerun_test(ticketId)` — re-run just that test through the MCP.
   - **Pass** → the MCP already moves the ticket to `Done`. Add a short note and,
     if useful, the `fixDiff`.
   - **Fail** → refine the hypothesis and repeat, up to 3 attempts total.
5. After 3 failures: `update_ticket(ticketId, { status: "NeedsHuman", note:
   "<what you tried and why it didn't work>" })`.

## Discipline

- One ticket at a time; smallest change that makes the test pass.
- Never disable, weaken, or skip a test; never edit fixtures or the Playwright
  config to dodge a failure.
- Never print or commit secrets (API keys, tokens). See `AGENTS.md`.
- Every Kintsugi MCP tool takes an absolute `projectRoot` — pass the workspace
  root.
