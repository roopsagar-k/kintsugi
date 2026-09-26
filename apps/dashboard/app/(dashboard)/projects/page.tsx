import Link from "next/link"
import { ExternalLink, Globe, KeyRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProjects } from "@/lib/dashboard-data"
import { NewProjectButton, RotateKeyButton, DeleteProjectButton } from "@/components/project-actions"

export const dynamic = "force-dynamic"

function fmtDate(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Apps connected to Kintsugi.</p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No projects yet. Click <span className="font-medium text-foreground">New project</span> to add one.
          </CardContent>
        </Card>
      )}

      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-sm font-bold text-white">
                {project.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  {project.baseUrl}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">{project.openTickets} open tickets</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Runs" value={project.runs} />
              <Stat label="Open tickets" value={project.openTickets} />
              <Stat label="Created" value={fmtDate(project.createdAt)} />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <KeyRound className="size-4" /> MCP API key
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  {(project.keyPrefix ?? "kts_live_") + "••••••••••••••••••••"}
                </code>
                <RotateKeyButton projectId={project.id} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Used by the Kintsugi MCP server in <code>.bob/mcp.json</code>. Only the SHA-256 hash is stored.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/board" />}>
                Open board <ExternalLink className="size-3.5" />
              </Button>
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
