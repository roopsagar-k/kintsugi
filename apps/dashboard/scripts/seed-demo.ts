#!/usr/bin/env tsx
/**
 * scripts/seed-demo.ts
 *
 * Fills the dashboard with realistic DUMMY data (runs, tickets, events) so the
 * Overview, Board, and Runs pages render fully populated — handy for screenshots.
 *
 *   npm run db:seed-demo
 *
 * Clear it again anytime with `npm run db:reset` (keeps the project + API key,
 * deletes runs/results/tickets/events).
 */

import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })
import { randomUUID } from "node:crypto"
import { putDoc, find } from "../lib/cloudant"
import type { Project, Run, Ticket, Event, Result, Severity, TicketStatus } from "../lib/types"

const NOW = Date.now()
const iso = (daysAgo: number, extraMin = 0) =>
  new Date(NOW - daysAgo * 86_400_000 + extraMin * 60_000).toISOString()

async function main() {
  // Use the existing ShopLite project if present (pages read all docs regardless).
  const projects = await find<Project>({ type: "project" }, { limit: 20 })
  const project = projects.find((p) => p.name === "ShopLite") ?? projects[0]
  const projectId = project?._id ?? `project:${randomUUID()}`
  if (!project) console.warn("[seed-demo] No project found — using a placeholder projectId.")

  // ── Runs: an improving pass-rate story over ~2 weeks ──────────────────────────
  const runSpecs: Array<{ d: number; pass: number; fail: number; status: Run["status"]; trigger: Run["trigger"]; durMin: number }> = [
    { d: 16, pass: 16, fail: 8, status: "failed", trigger: "bob", durMin: 2.9 },
    { d: 13, pass: 18, fail: 6, status: "failed", trigger: "ci", durMin: 2.7 },
    { d: 10, pass: 20, fail: 4, status: "failed", trigger: "bob", durMin: 2.5 },
    { d: 7, pass: 21, fail: 3, status: "failed", trigger: "manual", durMin: 2.4 },
    { d: 4, pass: 24, fail: 0, status: "passed", trigger: "bob", durMin: 2.3 },
    { d: 2, pass: 22, fail: 2, status: "failed", trigger: "bob", durMin: 2.2 },
    { d: 0, pass: 22, fail: 2, status: "failed", trigger: "bob", durMin: 2.4 },
  ]
  const runIds: string[] = []
  for (const r of runSpecs) {
    const id = `run:demo-${randomUUID()}`
    runIds.push(id)
    const run: Run = {
      _id: id,
      type: "run",
      projectId,
      planId: `testPlan:demo`,
      status: r.status,
      startedAt: iso(r.d),
      endedAt: iso(r.d, r.durMin),
      counts: { pass: r.pass, fail: r.fail, skip: 0 },
      trigger: r.trigger,
    }
    await putDoc(run)
  }
  const latestRun = runIds[runIds.length - 1]

  // ── Tickets: the five real ShopLite bugs + a few plausible extras ─────────────
  type T = {
    title: string
    status: TicketStatus
    severity: Severity
    area: string
    cause: string
    files: string[]
    source: "watsonx" | "heuristic"
    confidence: number
    attempts: number
    ageDays: number
    runId: string
    fixDiff?: string
    console?: string
    network?: string
  }
  const tickets: T[] = [
    {
      title: "Checkout accepts an empty email",
      status: "Backlog", severity: "high", area: "checkout",
      cause: "The checkout form submits without validating the email field, so an order can be placed with a blank email address.",
      files: ["src/pages/Checkout.tsx", "src/lib/validators.ts"],
      source: "watsonx", confidence: 0.92, attempts: 0, ageDays: 1, runId: latestRun,
      console: "No console errors — the form simply resolves the submit handler.",
    },
    {
      title: "Add-to-cart button hidden on mobile",
      status: "Backlog", severity: "medium", area: "ui",
      cause: "The add-to-cart button carries a `max-md:hidden` class, making it unreachable below 768px.",
      files: ["src/pages/Product.tsx"],
      source: "watsonx", confidence: 0.88, attempts: 0, ageDays: 1, runId: latestRun,
    },
    {
      title: "Cart quantity can be set to zero",
      status: "InProgress", severity: "medium", area: "state",
      cause: "setQuantity stores 0 instead of removing the line item, leaving a $0 ghost row in the cart.",
      files: ["src/store/store.tsx"],
      source: "watsonx", confidence: 0.9, attempts: 1, ageDays: 2, runId: latestRun,
    },
    {
      title: "Product image 404s on slow connections",
      status: "InReview", severity: "low", area: "network",
      cause: "The hero image has no fallback; a slow CDN response surfaces a broken image before load.",
      files: ["src/components/ProductImage.tsx"],
      source: "heuristic", confidence: 0.61, attempts: 1, ageDays: 3, runId: runIds[5],
      network: "GET /img/hero-42.jpg → 404 (retried once, then rendered broken).",
    },
    {
      title: "Payment webhook drops events under load",
      status: "NeedsHuman", severity: "high", area: "api",
      cause: "Under concurrent checkout the webhook handler races on the orders map; ~3% of events are lost. Needs a human — likely a backend queue change.",
      files: ["server/webhooks/payment.ts"],
      source: "watsonx", confidence: 0.74, attempts: 3, ageDays: 5, runId: runIds[3],
      network: "POST /webhooks/payment → 200, but order not persisted (race).",
    },
    {
      title: "No auth guard on /account route",
      status: "Done", severity: "high", area: "auth",
      cause: "The account page rendered without a session check, so anyone could open /account directly.",
      files: ["src/pages/Account.tsx"],
      source: "watsonx", confidence: 0.95, attempts: 1, ageDays: 6, runId: runIds[2],
      fixDiff: `--- a/src/pages/Account.tsx
+++ b/src/pages/Account.tsx
@@ export default function Account() {
-  return <Profile />
+  const { user } = useAuth()
+  if (!user) return <Navigate to="/login" replace />
+  return <Profile />
 }`,
    },
    {
      title: "Console error thrown on product page mount",
      status: "Done", severity: "low", area: "ui",
      cause: "A stray console.error left in a useEffect fired on every product mount, failing the console-clean assertion.",
      files: ["src/pages/Product.tsx"],
      source: "heuristic", confidence: 0.7, attempts: 1, ageDays: 7, runId: runIds[2],
      console: 'error: "debug: product mounted" logged on every mount.',
      fixDiff: `--- a/src/pages/Product.tsx
+++ b/src/pages/Product.tsx
@@ useEffect(() => {
-  useEffect(() => {
-    console.error("debug: product mounted", id)
-  }, [id])
+  // removed stray debug logging on mount
 }, [id])`,
    },
    {
      title: "Coupon code comparison is case-sensitive",
      status: "Done", severity: "medium", area: "checkout",
      cause: "Discount codes were compared with strict equality, so 'save10' failed while 'SAVE10' worked.",
      files: ["src/pages/Checkout.tsx"],
      source: "watsonx", confidence: 0.86, attempts: 2, ageDays: 9, runId: runIds[1],
      fixDiff: `--- a/src/pages/Checkout.tsx
+++ b/src/pages/Checkout.tsx
@@ applyCoupon(code) {
-  if (code === "SAVE10") applyDiscount(0.1)
+  if (code.trim().toUpperCase() === "SAVE10") applyDiscount(0.1)
 }`,
    },
    {
      title: "Footer 'Careers' link returns 404",
      status: "Done", severity: "low", area: "ui",
      cause: "The footer linked to /career (singular) while the route is /careers.",
      files: ["src/components/Footer.tsx"],
      source: "heuristic", confidence: 0.65, attempts: 1, ageDays: 11, runId: runIds[0],
      fixDiff: `--- a/src/components/Footer.tsx
+++ b/src/components/Footer.tsx
-  <a href="/career">Careers</a>
+  <a href="/careers">Careers</a>`,
    },
  ]

  for (const t of tickets) {
    const id = `ticket:demo-${randomUUID()}`
    const created = iso(t.ageDays)
    const updated = iso(Math.max(0, t.ageDays - 1))
    const evidence: Ticket["evidence"] = [{ kind: "screenshot", note: "Failure screenshot captured by Playwright" }]
    if (t.console) evidence.push({ kind: "console", note: t.console })
    if (t.network) evidence.push({ kind: "network", note: t.network })
    if (t.fixDiff) evidence.push({ kind: "trace", note: "Playwright trace attached" })

    const history: Ticket["history"] = [
      { ts: created, actor: "bob", to: "Backlog", note: "Raised from a failing test" },
    ]
    if (t.status !== "Backlog") history.push({ ts: iso(Math.max(0, t.ageDays - 1)), actor: "bob", from: "Backlog", to: "InProgress" })
    if (t.status === "Done") history.push({ ts: updated, actor: "bob", from: "InProgress", to: "Done", note: "rerun_test passed" })
    if (t.status === "NeedsHuman") history.push({ ts: updated, actor: "bob", from: "InProgress", to: "NeedsHuman", note: "Gave up after 3 attempts" })

    const ticket: Ticket = {
      _id: id,
      type: "ticket",
      projectId,
      title: t.title,
      status: t.status,
      severity: t.severity,
      runId: t.runId,
      testId: `${t.area}/${t.title.toLowerCase().replace(/[^a-z]+/g, "-").slice(0, 24)}`,
      triage: {
        cause: t.cause,
        area: t.area,
        severity: t.severity,
        suspectedFiles: t.files,
        confidence: t.confidence,
        source: t.source,
      },
      evidence,
      attempts: t.attempts,
      fixDiff: t.fixDiff,
      history,
      createdAt: created,
      updatedAt: updated,
    }
    await putDoc(ticket)
  }

  // ── Events: a recent activity feed ────────────────────────────────────────────
  const events: Array<{ kind: string; payload: Record<string, unknown>; d: number; min: number }> = [
    { kind: "run.started", payload: { trigger: "bob" }, d: 0, min: 0 },
    { kind: "result.posted", payload: { status: "failed" }, d: 0, min: 1 },
    { kind: "ticket.created", payload: { severity: "high" }, d: 0, min: 1.5 },
    { kind: "ticket.moved", payload: { from: "Backlog", to: "InProgress" }, d: 0, min: 2 },
    { kind: "run.updated", payload: { status: "failed" }, d: 0, min: 2.5 },
    { kind: "ticket.moved", payload: { from: "InProgress", to: "Done" }, d: 2, min: 4 },
    { kind: "run.started", payload: { trigger: "bob" }, d: 2, min: 0 },
    { kind: "ticket.created", payload: { severity: "medium" }, d: 3, min: 3 },
    { kind: "plan.created", payload: {}, d: 4, min: 0 },
    { kind: "run.updated", payload: { status: "passed" }, d: 4, min: 2.3 },
  ]
  for (const e of events) {
    const ev: Event = {
      _id: `event:demo-${randomUUID()}`,
      type: "event",
      projectId,
      ts: iso(e.d, e.min),
      kind: e.kind,
      payload: e.payload,
    }
    await putDoc(ev)
  }

  // ── A few results for the latest run (in case a run-detail view is screenshotted)
  const failing = tickets.filter((t) => t.status !== "Done").slice(0, 3)
  for (const t of failing) {
    const res: Result = {
      _id: `result:demo-${randomUUID()}`,
      type: "result",
      projectId,
      runId: latestRun,
      testId: t.title.toLowerCase().replace(/[^a-z]+/g, "-").slice(0, 24),
      retryIndex: 0,
      title: t.title,
      specFile: t.files[0] ?? "spec.ts",
      line: 12,
      status: "failed",
      durationMs: Math.round(800 + Math.random() * 2200),
      error: { message: t.cause.slice(0, 80) },
      console: t.console ? [{ type: "error", text: t.console }] : [],
      network: [],
      createdAt: iso(0, 1),
    }
    await putDoc(res)
  }

  console.log("\n✅ Seeded demo data:")
  console.log(`   ${runIds.length} runs · ${tickets.length} tickets · ${events.length} events`)
  console.log(`   project: ${project?.name ?? "(placeholder)"} (${projectId})`)
  console.log("\n   Screenshot /overview, /board, /runs — then clear with: npm run db:reset\n")
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("[seed-demo] Fatal:", err)
    process.exit(1)
  })
