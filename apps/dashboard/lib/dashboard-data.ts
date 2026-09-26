import "server-only"
import { find } from "@/lib/cloudant"
import type { Ticket, Run, Event, Project, ApiKey } from "@/lib/types"
import type { UiTicket, UiRun, UiEvent } from "@/lib/mock-data"

// Server-side data access for the dashboard UI. Unlike the /api/v1 routes (which
// authenticate the MCP by API key), these run in server components and read Cloudant
// directly. Single-project demo: we read all docs of each type.

function toUiTicket(t: Ticket): UiTicket {
  const screenshot = t.evidence?.find((e) => e.kind === "screenshot")?.url
  return {
    id: t._id,
    title: t.title,
    severity: t.severity,
    status: t.status,
    area: t.triage?.area ?? "unknown",
    cause: t.triage?.cause ?? "",
    specFile: "",
    runId: t.runId,
    testId: t.testId,
    attempts: t.attempts ?? 0,
    confidence: t.triage?.confidence ?? 0.5,
    source: (t.triage?.source as "watsonx" | "heuristic") ?? "heuristic",
    screenshot,
    fixDiff: t.fixDiff,
    evidence: (t.evidence ?? []).map((e) => ({ kind: e.kind, note: e.note })),
    history: (t.history ?? []).map((h) => ({
      ts: h.ts,
      actor: h.actor,
      from: h.from,
      to: h.to,
      note: h.note,
    })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

export async function getBoardTickets(): Promise<UiTicket[]> {
  const tickets = await find<Ticket>({ type: "ticket" }, { limit: 500 })
  return tickets.map(toUiTicket)
}

export async function getRunsData(): Promise<UiRun[]> {
  const runs = await find<Run>({ type: "run" }, { limit: 100 })
  return runs
    .map((r) => ({
      id: r._id,
      status: (r.status === "passed" || r.status === "failed" || r.status === "running"
        ? r.status
        : "error") as UiRun["status"],
      trigger: r.trigger,
      planName: r.planId ? "Test plan" : "Ad-hoc run",
      startedAt: r.startedAt,
      durationMs: r.endedAt ? new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime() : 0,
      counts: r.counts ?? { pass: 0, fail: 0, skip: 0 },
    }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export interface ProjectRow {
  id: string
  name: string
  baseUrl: string
  createdAt?: string
  runs: number
  openTickets: number
  keyPrefix?: string
}

export async function getProjects(): Promise<ProjectRow[]> {
  const [projects, runs, tickets, keys] = await Promise.all([
    find<Project>({ type: "project" }, { limit: 100 }),
    find<Run>({ type: "run" }, { limit: 1000 }),
    find<Ticket>({ type: "ticket" }, { limit: 1000 }),
    find<ApiKey>({ type: "apiKey" }, { limit: 100 }),
  ])
  return projects
    .map((p) => ({
      id: p._id,
      name: p.name,
      baseUrl: p.baseUrl,
      createdAt: p.createdAt,
      runs: runs.filter((r) => r.projectId === p._id).length,
      openTickets: tickets.filter((t) => t.projectId === p._id && t.status !== "Done").length,
      keyPrefix: keys.find((k) => k.projectId === p._id)?.prefix,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
}

export async function getEventsData(): Promise<UiEvent[]> {
  const events = await find<Event>({ type: "event" }, { limit: 50 })
  return events
    .map((e) => ({ id: e._id, ts: e.ts, kind: e.kind, text: describeEvent(e) }))
    .sort((a, b) => b.ts.localeCompare(a.ts))
}

export interface OverviewData {
  summary: { totalTests: number; passRate: number; openTickets: number; autoHealed: number; needsHuman: number }
  passRateTrend: Array<{ run: string; passRate: number }>
  severityCounts: { critical: number; high: number; medium: number; low: number }
  events: UiEvent[]
}

export async function getOverviewData(): Promise<OverviewData> {
  const [tickets, runs, events] = await Promise.all([
    find<Ticket>({ type: "ticket" }, { limit: 500 }),
    find<Run>({ type: "run" }, { limit: 100 }),
    getEventsData(),
  ])

  const open = tickets.filter((t) => t.status !== "Done")
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of open) severityCounts[t.severity]++

  const sorted = runs.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const passRateTrend = sorted
    .filter((r) => r.counts)
    .map((r, i) => {
      const c = r.counts!
      const total = c.pass + c.fail + c.skip
      return { run: `#${i + 1}`, passRate: total ? Math.round((c.pass / total) * 100) : 0 }
    })

  const latest = sorted[sorted.length - 1]?.counts ?? { pass: 0, fail: 0, skip: 0 }
  const summary = {
    totalTests: latest.pass + latest.fail + latest.skip,
    passRate: latest.pass + latest.fail ? Math.round((latest.pass / (latest.pass + latest.fail)) * 100) : 0,
    openTickets: open.length,
    autoHealed: tickets.filter((t) => t.status === "Done").length,
    needsHuman: tickets.filter((t) => t.status === "NeedsHuman").length,
  }

  return { summary, passRateTrend, severityCounts, events }
}

function describeEvent(e: Event): string {
  const p = e.payload as Record<string, unknown>
  switch (e.kind) {
    case "run.started": return `Bob started a run (${p.trigger ?? "bob"})`
    case "run.updated": return `Run ${String(p.status ?? "")}`
    case "result.posted": return `Result posted: ${p.status ?? ""}`
    case "ticket.created": return `Ticket raised (${p.severity ?? ""})`
    case "ticket.moved": return `Ticket moved ${p.from ?? ""} → ${p.to ?? ""}`
    case "plan.created": return "Test plan saved"
    default: return e.kind
  }
}
