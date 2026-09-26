---
name: qa-report
description: Use when the user wants a summary of the latest Kintsugi run or the ticket board (e.g. "/qa-report", "show the QA report", "how did the tests do", "what's on the board"). Generates an HTML run report and summarises tickets.
---

# /qa-report — summarise the run and the board

Produces a human-readable summary of QA state via the `kintsugi` MCP server
(`use_mcp_tool`, `server_name: "kintsugi"`, absolute `projectRoot`).

## Steps

1. **Report the run.** If you know the latest `runId`, call
   `generate_report(runId)` to write an HTML report and get its file URL. If you
   don't have a `runId`, ask the user or skip to the board summary.

2. **Summarise the board.** Call `list_tickets` (no filter) and group by status:
   `Backlog`, `InProgress`, `InReview`, `Done`, `NeedsHuman`. For each open
   ticket show `ticketId`, severity, and title.

3. **Present.** Give a short scoreboard — total tests, passed/failed, tickets by
   status, and the report URL. Recommend the next action:
   - open tickets remaining → suggest `/qa-heal`
   - all green → suggest `/qa-run` again for broader coverage.

## Notes
- Read-only summarisation; don't change ticket state here.
- The report is written under `.kintsugi/.local/reports/<runId>.html` in local
  mode.
