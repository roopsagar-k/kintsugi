import { Activity, Bug, CheckCircle2, FlaskConical, UserRoundX } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PassRateChart, SeverityChart } from "@/components/charts"
import { getOverviewData } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

export default async function OverviewPage() {
  const { summary, passRateTrend, severityCounts, events } = await getOverviewData()

  const stats = [
    { label: "Tests (latest run)", value: summary.totalTests, icon: FlaskConical, hint: "across all lanes" },
    { label: "Pass rate", value: `${summary.passRate}%`, icon: CheckCircle2, hint: "latest run" },
    { label: "Open tickets", value: summary.openTickets, icon: Bug, hint: "not yet Done" },
    { label: "Auto-healed", value: summary.autoHealed, icon: Activity, hint: "fixed by Bob" },
    { label: "Needs human", value: summary.needsHuman, icon: UserRoundX, hint: "escalated" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Autonomous QA activity for ShopLite.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{s.label}</CardDescription>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass rate over runs</CardTitle>
            <CardDescription>Trend as Bob heals failures</CardDescription>
          </CardHeader>
          <CardContent>
            <PassRateChart data={passRateTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open tickets by severity</CardTitle>
            <CardDescription>watsonx / heuristic triage</CardDescription>
          </CardHeader>
          <CardContent>
            <SeverityChart counts={severityCounts} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
          <CardDescription>Live feed of runs, tickets and heals</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <div className="flex-1">
                <p>{e.text}</p>
                <p className="text-xs text-muted-foreground">
                  {e.kind} · {timeAgo(e.ts)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
