import type { NextRequest } from "next/server"
import { verifyApiKey } from "@/lib/auth"
import { find, getDoc, putDoc } from "@/lib/cloudant"
import { unauthorized, badRequest, notFound, created } from "@/lib/http"
import { CreateReportSchema } from "@/lib/schemas"
import type { Report, Result, Run, Ticket } from "@/lib/types"

// POST /api/v1/reports — generate an HTML/summary report for a completed run.
export async function POST(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth.ok) return unauthorized(auth.message)

  const body = await request.json().catch(() => null)
  const parsed = CreateReportSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.message)

  const { runId } = parsed.data

  const run = await getDoc<Run>(runId)
  if (!run || run.projectId !== auth.projectId) return notFound("Run not found.")

  const results = await find<Result>({ type: "result", runId, projectId: auth.projectId })
  const tickets = await find<Ticket>({ type: "ticket", runId, projectId: auth.projectId })

  const counts = run.counts ?? {
    pass: results.filter(r => r.status === "passed").length,
    fail: results.filter(r => r.status === "failed" || r.status === "timedOut").length,
    skip: results.filter(r => r.status === "skipped").length,
  }

  const failures = tickets.filter(t => t.status !== "Done")
  const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of failures) severityCounts[t.severity] = (severityCounts[t.severity] ?? 0) + 1

  const generatedAt = new Date().toISOString()

  // Build a compact HTML report (stored inline, no external blob store needed).
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Kintsugi Run Report — ${runId}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
th{background:#f7f8fa}.critical{color:#dc2626}.high{color:#ea580c}.medium{color:#ca8a04}.low{color:#16a34a}
</style></head>
<body>
<h1>Run Report</h1>
<p><strong>Run ID:</strong> ${runId}<br>
<strong>Status:</strong> ${run.status}<br>
<strong>Started:</strong> ${run.startedAt}<br>
<strong>Ended:</strong> ${run.endedAt ?? "—"}<br>
<strong>Generated:</strong> ${generatedAt}</p>
<h2>Summary</h2>
<table><tr><th>Passed</th><th>Failed</th><th>Skipped</th></tr>
<tr><td>${counts.pass}</td><td>${counts.fail}</td><td>${counts.skip}</td></tr></table>
<h2>Open Tickets by Severity</h2>
<table><tr><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr>
<tr>
  <td class="critical">${severityCounts.critical}</td>
  <td class="high">${severityCounts.high}</td>
  <td class="medium">${severityCounts.medium}</td>
  <td class="low">${severityCounts.low}</td>
</tr></table>
<h2>Failures</h2>
<table><tr><th>Test</th><th>Severity</th><th>Cause</th><th>Status</th></tr>
${tickets.map(t => `<tr><td>${escHtml(t.title)}</td><td class="${t.severity}">${t.severity}</td><td>${escHtml(t.triage.cause)}</td><td>${t.status}</td></tr>`).join("")}
</table>
</body></html>`

  const reportId = `report:${runId}`
  const appUrl = process.env.APP_URL ?? ""
  const summary = { counts, severityCounts }

  // Persist the report so GET /reports/:id can serve it.
  const doc: Report = {
    _id: reportId,
    type: "report",
    projectId: auth.projectId,
    runId,
    html,
    summary,
    generatedAt,
  }
  await putDoc({ ...(await getDoc<Report>(reportId)), ...doc })

  return created({
    reportId,
    url: `${appUrl}/api/v1/reports/${encodeURIComponent(reportId)}`,
    generatedAt,
    summary,
  })
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
