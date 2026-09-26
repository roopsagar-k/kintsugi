---
name: qa-init
description: Use when the user wants to set up or initialise Kintsugi QA for a project (e.g. "/qa-init", "set up Kintsugi", "scaffold the QA workspace") without running tests yet. Creates the .kintsugi workspace and checks Playwright prerequisites.
---

# /qa-init — initialise the Kintsugi QA workspace

One-time setup, separated from `/qa-run` for when the user just wants the
workspace scaffolded. Uses the `kintsugi` MCP server (`use_mcp_tool`).

## Steps

1. **Switch mode.** `switch_mode` to `kintsugi-qa`.

2. **Gather inputs.** With `ask_followup_question`, confirm:
   - `baseUrl` — where the app runs (default `http://localhost:3000`).
   - `startCommand` — how to start it (e.g. `npm run dev`); omit if it's already
     running.
   - `webServerTimeoutMs` — only if the app is slow to boot (default 120000).

3. **Initialise.** Call `init_project` with `projectRoot` (workspace root) plus
   the above.
   - `ready: true` → report the created files (`.kintsugi/config.json`,
     `playwright.config.ts`, `tests/fixtures.ts`, `.gitignore`) and tell the user
     they can now run `/qa-run`.
   - `ready: false` → relay the `installCommands` for the user to run (you have no
     shell), then stop until Playwright + browsers are installed and re-run this.

## Notes
- Safe to re-run: `init_project` won't overwrite an existing `config.json`.
- Kintsugi runs in `local` mode (`.bob/mcp.json`); state lives in
  `.kintsugi/.local/`.
