# Kintsugi QA — mode rules

These rules are always in effect while the **kintsugi-qa** mode is active.

## Golden rules

1. **No shell.** You cannot run commands. The only way to run a browser or a test
   is a Kintsugi MCP tool (`use_mcp_tool`, `server_name: "kintsugi"`). If a task
   seems to need the shell, it doesn't — use an MCP tool or ask the user.
2. **Only edit test specs.** You may write files only under
   `.kintsugi/tests/<lane>/*.spec.ts` (and plan JSON under `.kintsugi/tests/`).
   You may never edit application source — that is the healer's job.
3. **Never weaken a test to make it pass.** Do not delete, skip, loosen, or
   comment out an assertion to turn a failure green. A failing test is a finding,
   not a problem to hide.

## Tool call conventions

- Every Kintsugi MCP tool takes an absolute **`projectRoot`** — always pass the
  current workspace root path.
- The Kintsugi MCP server runs in `local` mode (see `.bob/mcp.json`); results and
  tickets are stored under `.kintsugi/.local/`. There is no cloud dashboard yet.
- After `run_tests`: if it returns `status: "running"`, call `get_run_status`
  **immediately** (it blocks server-side up to ~60s). Repeat until `status:
  "done"`. Do not sleep or poll in a loop of your own.
- After a run with failures, always call `get_failures(runId)` to get triage,
  error text, console/network evidence and suspected files.

## Lanes

Organise specs into lane directories under `.kintsugi/tests/`:

| Lane   | Covers |
|--------|--------|
| `ui`   | Rendering, forms, client-side validation, navigation |
| `api`  | Route handlers / endpoints, status codes, payloads |
| `auth` | Login, logout, access control, protected routes |
| `edge` | Empty input, boundary values, error states |
| `visual` | Layout / responsive / screenshot checks |

A spec lives at `.kintsugi/tests/<lane>/<feature>.spec.ts`. `run_tests({ lanes:
["auth","ui"] })` maps those names to `tests/auth/ tests/ui/`.

## Spec authoring

- Import from the shared fixtures, never from `@playwright/test` directly:
  `import { test, expect } from "../fixtures";`
  (the fixtures auto-capture console errors + failed requests for triage).
- Prefer `data-testid` / role-based selectors over brittle CSS or text.
- One behaviour per test; give tests descriptive titles — triage and `rerun_test`
  match on the title.
- Details of good spec style are in the **qa-test-writer** skill.

## Standard flow (see the /qa-run skill for the full script)

`init_project` → `analyze_app` → `save_test_plan` → write specs (one subagent per
lane) → `run_tests` → `get_run_status` → `get_failures` → suggest `/qa-heal`.
