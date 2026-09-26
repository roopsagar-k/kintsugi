import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRunsData } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

export default async function RunsPage() {
  const runs = await getRunsData()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="text-sm text-muted-foreground">Every test run Bob has triggered on ShopLite.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="text-right">Passed</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Skipped</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No runs yet — run /qa-run to get started.
                  </TableCell>
                </TableRow>
              )}
              {runs.map((r) => {
                const failed = r.counts.fail > 0
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {failed ? (
                          <XCircle className="size-4 shrink-0 text-red-500" />
                        ) : (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        )}
                        {r.id.replace("run:", "").slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.planName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {r.trigger}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {r.counts.pass}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                      {r.counts.fail}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.counts.skip}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {timeAgo(r.startedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
