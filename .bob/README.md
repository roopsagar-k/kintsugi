# Bob integration

Everything Bob needs to run Kintsugi lives in this folder. Bob loads it automatically
when the project is open.

```
.bob/
├── mcp.json              # registers the Kintsugi MCP server (gitignored — has a key)
├── mock-mcp.json         # committed template → copy to mcp.json
├── custom_modes.yaml     # the two Kintsugi modes
├── rules-kintsugi-qa/    # rules always in effect in QA mode
├── rules-kintsugi-healer/# rules always in effect in healer mode
└── skills/               # the /qa-* slash commands (Bob 2.0 skills)
```

## Modes

| Mode | Purpose | Can edit | Shell? |
|---|---|---|---|
| **kintsugi-qa** | Plan, write, and run E2E tests | `.kintsugi/tests/**` only | no |
| **kintsugi-healer** | Fix app code so failing tests pass | everything **except** `.kintsugi/tests/**` | no |

Neither mode has the `command` (shell) group — the only way to run a browser or a test
is a Kintsugi MCP tool. That's the core safety property: Bob can't run arbitrary shell
commands, and the healer physically cannot weaken a test (the edit permission blocks
`.kintsugi/tests/**`).

## Skills (slash commands)

In Bob 2.0, slash commands are skills. Each lives in `skills/<name>/SKILL.md`.

| Command | Mode | What it does |
|---|---|---|
| `/qa-init` | kintsugi-qa | Scaffold the `.kintsugi/` workspace |
| `/qa-run` | kintsugi-qa | Plan → write specs → run → open tickets for failures |
| `/qa-heal` | kintsugi-healer | Diagnose → fix app code → re-run until green |
| `/qa-report` | kintsugi-qa | Summarise the latest run + the ticket board |
| `qa-test-writer` | — | Spec-writing conventions (auto-applies while authoring) |

## MCP config

`mcp.json` registers the MCP server and carries its env. It holds a secret
`KINTSUGI_API_KEY`, so it is **gitignored** — set yours up from the template:

```bash
cp .bob/mock-mcp.json .bob/mcp.json
```

Then edit it: absolute path to `mcp/dist/index.js`, your API key (from
`npm run db:seed` in `apps/dashboard`), and `KINTSUGI_MODE` = `local` or `cloud`.

## Guardrails
Project-wide rules for both modes are in [`../AGENTS.md`](../AGENTS.md); mode-specific
rules are in `rules-kintsugi-qa/` and `rules-kintsugi-healer/`.
