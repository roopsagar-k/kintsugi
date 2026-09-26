import type { Severity, TicketStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", SEVERITY_STYLES[severity], className)}>
      {severity}
    </Badge>
  )
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  Backlog: "Backlog",
  InProgress: "In Progress",
  InReview: "In Review",
  Done: "Done",
  NeedsHuman: "Needs Human",
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  Backlog: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  InProgress: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  InReview: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  NeedsHuman: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function statusLabel(status: TicketStatus): string {
  return STATUS_LABEL[status]
}
