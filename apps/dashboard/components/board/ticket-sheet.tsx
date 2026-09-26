"use client"

import * as React from "react"
import { Clock, Download, FileCode2, GitPullRequestArrow, Loader2, Maximize2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import type { UiTicket } from "@/lib/mock-data"
import { requestRerun } from "@/lib/actions"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { SeverityBadge, StatusBadge } from "@/components/badges"
import { cn } from "@/lib/utils"

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

export function TicketSheet({
  ticket,
  onOpenChange,
}: {
  ticket: UiTicket | null
  onOpenChange: (open: boolean) => void
}) {
  const [zoom, setZoom] = React.useState(false)
  const [diffOpen, setDiffOpen] = React.useState(false)
  const [rerunning, setRerunning] = React.useState(false)
  const [queued, setQueued] = React.useState(false)

  // Reset "queued" when a different ticket opens: queued = the most recent history
  // entry is a re-run request (and nothing has run since). Adjusting state during
  // render on a key change — the React-recommended alternative to an effect.
  const [seenTicketId, setSeenTicketId] = React.useState(ticket?.id)
  if (ticket?.id !== seenTicketId) {
    setSeenTicketId(ticket?.id)
    const last = ticket?.history?.[ticket.history.length - 1]
    setQueued(Boolean(last?.note?.toLowerCase().includes("re-run requested")))
  }

  // Screenshot / video / trace are rendered as media below; keep only the
  // text-note evidence (console, network, diff) for the list.
  const textEvidence = (ticket?.evidence ?? []).filter(
    (e) => !["screenshot", "video", "trace"].includes(e.kind),
  )

  async function onRerun(t: UiTicket) {
    setRerunning(true)
    const res = await requestRerun(t.id)
    setRerunning(false)
    if (res.ok) {
      setQueued(true)
      toast.success("Re-run requested", {
        description: `Queued "${t.title}" — Bob re-runs it via /qa-heal.`,
      })
    } else {
      toast.error(res.message ?? "Could not request a re-run.")
    }
  }

  return (
    <Sheet open={!!ticket} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {ticket && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={ticket.severity} />
                <StatusBadge status={ticket.status} />
              </div>
              <SheetTitle className="text-lg leading-snug">{ticket.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1.5">
                <FileCode2 className="size-3.5" />
                {ticket.specFile}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-6">
              {/* Triage */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Triage</h3>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {ticket.source === "watsonx" && <Sparkles className="size-3" />}
                    {ticket.source} · {Math.round(ticket.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{ticket.cause}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Area" value={ticket.area} />
                  <Field label="Heal attempts" value={String(ticket.attempts)} />
                </div>
              </section>

              <Separator />

              {/* Evidence */}
              <section>
                <h3 className="mb-2 text-sm font-semibold">Evidence</h3>
                {ticket.screenshot && (
                  <div className="relative mb-3 overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ticket.screenshot} alt="Failure screenshot" className="w-full" />
                    <button
                      type="button"
                      aria-label="Enlarge screenshot"
                      onClick={() => setZoom(true)}
                      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-md bg-background/80 text-foreground shadow-sm ring-1 ring-border backdrop-blur transition hover:bg-background"
                    >
                      <Maximize2 className="size-4" />
                    </button>
                  </div>
                )}
                {ticket.video && (
                  <div className="mb-3 overflow-hidden rounded-lg border bg-black">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={ticket.video}
                      controls
                      preload="metadata"
                      className="max-h-[360px] w-full bg-black"
                    />
                  </div>
                )}
                {ticket.trace && (
                  <a
                    href={ticket.trace}
                    download
                    className="mb-3 flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs transition hover:bg-muted"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Download className="size-3.5" /> Download Playwright trace
                    </span>
                    <code className="shrink-0 text-[10px] text-muted-foreground">
                      npx playwright show-trace
                    </code>
                  </a>
                )}
                {textEvidence.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {textEvidence.map((e, i) => (
                      <li key={i} className="rounded-md border bg-muted/40 p-2 text-xs">
                        <span className="font-medium capitalize">{e.kind}</span>
                        {e.note && <span className="text-muted-foreground"> — {e.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Separator />

              {/* History */}
              <section>
                <h3 className="mb-3 text-sm font-semibold">History</h3>
                <ol className="relative flex flex-col gap-4 border-l pl-4">
                  {ticket.history.map((h, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary ring-4 ring-background" />
                      <p className="text-sm">
                        {h.from && h.to ? (
                          <>
                            <span className="text-muted-foreground">{h.from}</span> →{" "}
                            <span className="font-medium">{h.to}</span>
                          </>
                        ) : (
                          <span className="font-medium capitalize">{h.actor} note</span>
                        )}
                      </p>
                      {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        {h.actor} · {timeAgo(h.ts)}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => setDiffOpen(true)}>
                  <GitPullRequestArrow className="size-4" /> View fix diff
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={rerunning || queued}
                  onClick={() => onRerun(ticket)}
                >
                  {rerunning ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Queueing…
                    </>
                  ) : queued ? (
                    <>
                      <Clock className="size-4" /> Queued
                    </>
                  ) : (
                    "Re-run test"
                  )}
                </Button>
              </div>

              <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogTitle>Fix diff</DialogTitle>
                  {ticket.fixDiff ? (
                    <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/30 py-1 font-mono text-xs leading-relaxed">
                      {ticket.fixDiff.split("\n").map((line, i) => {
                        const add = line.startsWith("+")
                        const del = line.startsWith("-")
                        return (
                          <div
                            key={i}
                            className={cn(
                              "whitespace-pre px-3",
                              add && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              del && "bg-red-500/10 text-red-600 dark:text-red-400",
                              !add && !del && "text-muted-foreground",
                            )}
                          >
                            {line || " "}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No fix has been applied yet. Bob records the diff here after it heals this
                      ticket with <code className="rounded bg-muted px-1">/qa-heal</code>.
                    </p>
                  )}
                </DialogContent>
              </Dialog>

              {ticket.screenshot && (
                <Dialog open={zoom} onOpenChange={setZoom}>
                  <DialogContent showCloseButton={false} className="max-w-5xl p-2 sm:max-w-5xl">
                    <DialogTitle className="sr-only">Failure screenshot</DialogTitle>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setZoom(false)}
                      className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/80"
                    >
                      <X className="size-4" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ticket.screenshot}
                      alt="Failure screenshot"
                      className="max-h-[85vh] w-full rounded object-contain"
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  )
}
