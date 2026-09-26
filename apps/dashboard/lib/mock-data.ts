// Demo data for the dashboard UI. Shaped like the real API responses so the views
// can swap `import { ... } from "@/lib/mock-data"` for live fetches later.
// The scenario mirrors a Kintsugi run against the ShopLite demo store.

import type { Severity, TicketStatus, Trigger } from "@/lib/types"

export interface UiTicket {
  id: string
  title: string
  severity: Severity
  status: TicketStatus
  area: string
  cause: string
  specFile: string
  runId: string
  testId: string
  attempts: number
  confidence: number
  source: "watsonx" | "heuristic"
  screenshot?: string
  fixDiff?: string
  evidence: { kind: string; note?: string }[]
  history: { ts: string; actor: "bob" | "user" | "ci"; from?: TicketStatus; to?: TicketStatus; note?: string }[]
  createdAt: string
  updatedAt: string
}

export interface UiRun {
  id: string
  status: "passed" | "failed" | "running" | "error"
  trigger: Trigger
  planName: string
  startedAt: string
  durationMs: number
  counts: { pass: number; fail: number; skip: number }
}

export interface UiEvent {
  id: string
  ts: string
  kind: string
  text: string
}

export const project = {
  id: "proj_shoplite",
  name: "ShopLite",
  baseUrl: "http://localhost:5173",
  createdAt: "2026-09-24T09:00:00Z",
}

const now = Date.now()
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString()

export const tickets: UiTicket[] = [
  {
    id: "tkt_auth01",
    title: "Account page reachable while logged out",
    severity: "critical",
    status: "NeedsHuman",
    area: "auth",
    cause: "The /account route renders without an authentication guard, exposing the page to logged-out visitors.",
    specFile: ".kintsugi/tests/auth/account.spec.ts",
    runId: "run_003",
    testId: "auth-account-guard",
    attempts: 3,
    confidence: 0.86,
    source: "watsonx",
    screenshot: "/mock/account-loggedout.png",
    evidence: [
      { kind: "screenshot", note: "Account page rendered as Guest" },
      { kind: "console", note: "No redirect fired" },
    ],
    history: [
      { ts: iso(48), actor: "bob", to: "Backlog", note: "Auto-created from failed result." },
      { ts: iso(40), actor: "bob", from: "Backlog", to: "InProgress", note: "Healer picked up ticket." },
      { ts: iso(30), actor: "bob", from: "InProgress", to: "NeedsHuman", note: "3 heal attempts failed — route guard conflicts with layout. Needs human." },
    ],
    createdAt: iso(48),
    updatedAt: iso(30),
  },
  {
    id: "tkt_ui01",
    title: "Checkout accepts an empty email",
    severity: "medium",
    status: "Backlog",
    area: "ui",
    cause: "The checkout submit handler validates every field except email, so an order can be placed with no email.",
    specFile: ".kintsugi/tests/ui/checkout.spec.ts",
    runId: "run_003",
    testId: "ui-checkout-empty-email",
    attempts: 0,
    confidence: 0.74,
    source: "watsonx",
    screenshot: "/mock/order-placed.png",
    evidence: [{ kind: "screenshot", note: "Order confirmed with blank email" }],
    history: [{ ts: iso(46), actor: "bob", to: "Backlog", note: "Auto-created from failed result." }],
    createdAt: iso(46),
    updatedAt: iso(46),
  },
  {
    id: "tkt_ui02",
    title: "Console error on the product page",
    severity: "medium",
    status: "Backlog",
    area: "ui",
    cause: "A leftover debug statement logs an error on every product view.",
    specFile: ".kintsugi/tests/ui/product.spec.ts",
    runId: "run_003",
    testId: "ui-product-console",
    attempts: 0,
    confidence: 0.68,
    source: "heuristic",
    evidence: [{ kind: "console", note: "[product] analytics context missing — view not tracked" }],
    history: [{ ts: iso(45), actor: "bob", to: "Backlog", note: "Auto-created from failed result." }],
    createdAt: iso(45),
    updatedAt: iso(45),
  },
  {
    id: "tkt_cart01",
    title: "Quantity 0 leaves a stray cart row",
    severity: "medium",
    status: "InProgress",
    area: "cart",
    cause: "Decrementing quantity to zero stores the value instead of removing the line item.",
    specFile: ".kintsugi/tests/cart/quantity.spec.ts",
    runId: "run_003",
    testId: "cart-qty-zero",
    attempts: 1,
    confidence: 0.79,
    source: "watsonx",
    screenshot: "/mock/cart-zero.png",
    evidence: [{ kind: "screenshot", note: "0 × Terra Bottle row, $NaN subtotal" }],
    history: [
      { ts: iso(44), actor: "bob", to: "Backlog", note: "Auto-created from failed result." },
      { ts: iso(12), actor: "bob", from: "Backlog", to: "InProgress", note: "Healer editing store/store.tsx." },
    ],
    createdAt: iso(44),
    updatedAt: iso(12),
  },
  {
    id: "tkt_vis01",
    title: "Add-to-cart button hidden on mobile",
    severity: "low",
    status: "InReview",
    area: "visual",
    cause: "The primary Add to cart button uses max-md:hidden, removing it on phone viewports.",
    specFile: ".kintsugi/tests/visual/product-mobile.spec.ts",
    runId: "run_003",
    testId: "visual-mobile-add",
    attempts: 1,
    confidence: 0.72,
    source: "heuristic",
    screenshot: "/mock/mobile-product.png",
    evidence: [{ kind: "diff", note: "Button not visible at 375px" }],
    history: [
      { ts: iso(43), actor: "bob", to: "Backlog", note: "Auto-created from failed result." },
      { ts: iso(20), actor: "bob", from: "Backlog", to: "InProgress" },
      { ts: iso(8), actor: "bob", from: "InProgress", to: "InReview", note: "Removed max-md:hidden; rerun green. Awaiting review." },
    ],
    createdAt: iso(43),
    updatedAt: iso(8),
  },
  {
    id: "tkt_api01",
    title: "Cart API 500s on quantity 0",
    severity: "high",
    status: "Done",
    area: "api",
    cause: "The /api/cart handler divided by quantity, throwing on zero.",
    specFile: ".kintsugi/tests/api/cart.spec.ts",
    runId: "run_002",
    testId: "api-cart-zero",
    attempts: 2,
    confidence: 0.88,
    source: "watsonx",
    evidence: [{ kind: "network", note: "POST /api/cart → 500" }],
    history: [
      { ts: iso(180), actor: "bob", to: "Backlog", note: "Auto-created from failed result." },
      { ts: iso(150), actor: "bob", from: "Backlog", to: "InProgress" },
      { ts: iso(120), actor: "bob", from: "InProgress", to: "Done", note: "Guarded quantity; rerun passed." },
    ],
    createdAt: iso(180),
    updatedAt: iso(120),
  },
]

export const runs: UiRun[] = [
  {
    id: "run_003",
    status: "failed",
    trigger: "bob",
    planName: "Full suite (5 lanes)",
    startedAt: iso(48),
    durationMs: 21_000,
    counts: { pass: 4, fail: 5, skip: 0 },
  },
  {
    id: "run_002",
    status: "failed",
    trigger: "bob",
    planName: "Full suite (5 lanes)",
    startedAt: iso(185),
    durationMs: 19_400,
    counts: { pass: 5, fail: 4, skip: 0 },
  },
  {
    id: "run_001",
    status: "failed",
    trigger: "bob",
    planName: "Smoke (ui, auth)",
    startedAt: iso(320),
    durationMs: 12_800,
    counts: { pass: 3, fail: 3, skip: 1 },
  },
]

export const events: UiEvent[] = [
  { id: "e1", ts: iso(8), kind: "ticket.moved", text: "Add-to-cart mobile fix moved to In Review" },
  { id: "e2", ts: iso(12), kind: "ticket.moved", text: "Healer started on cart quantity bug" },
  { id: "e3", ts: iso(30), kind: "ticket.escalated", text: "Account guard escalated to Needs Human after 3 attempts" },
  { id: "e4", ts: iso(46), kind: "ticket.created", text: "Ticket opened: checkout accepts empty email" },
  { id: "e5", ts: iso(48), kind: "run.finished", text: "Run run_003 finished — 4 passed, 5 failed" },
  { id: "e6", ts: iso(48), kind: "run.started", text: "Bob started run_003 (5 lanes)" },
]

// ── Derived metrics ──────────────────────────────────────────────────────────

export const STATUSES: TicketStatus[] = ["Backlog", "InProgress", "InReview", "Done", "NeedsHuman"]

export function ticketsByStatus(): Record<TicketStatus, UiTicket[]> {
  const map = Object.fromEntries(STATUSES.map((s) => [s, [] as UiTicket[]])) as Record<TicketStatus, UiTicket[]>
  for (const t of tickets) map[t.status].push(t)
  return map
}

export function severityCounts() {
  const c = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of tickets) if (t.status !== "Done") c[t.severity]++
  return c
}

export const passRateTrend = runs
  .slice()
  .reverse()
  .map((r) => {
    const total = r.counts.pass + r.counts.fail + r.counts.skip
    return { run: r.id.replace("run_", "#"), passRate: Math.round((r.counts.pass / total) * 100) }
  })

export const summary = {
  totalTests: runs[0].counts.pass + runs[0].counts.fail + runs[0].counts.skip,
  passRate: Math.round((runs[0].counts.pass / (runs[0].counts.pass + runs[0].counts.fail)) * 100),
  openTickets: tickets.filter((t) => t.status !== "Done").length,
  autoHealed: tickets.filter((t) => t.status === "Done").length,
  needsHuman: tickets.filter((t) => t.status === "NeedsHuman").length,
}
