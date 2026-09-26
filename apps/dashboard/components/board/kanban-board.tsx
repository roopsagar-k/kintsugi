"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { FileCode2, Sparkles } from "lucide-react"
import type { TicketStatus } from "@/lib/types"
import { STATUSES, type UiTicket } from "@/lib/mock-data"
import { SeverityBadge, statusLabel } from "@/components/badges"
import { cn } from "@/lib/utils"
import { TicketSheet } from "./ticket-sheet"

export function KanbanBoard({ tickets }: { tickets: UiTicket[] }) {
  const [columns, setColumns] = React.useState<Record<TicketStatus, UiTicket[]>>(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, [] as UiTicket[]])) as Record<TicketStatus, UiTicket[]>
    for (const t of tickets) (map[t.status] ??= []).push(t)
    return map
  })
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<UiTicket | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const allTickets = React.useMemo(() => Object.values(columns).flat(), [columns])
  const activeTicket = allTickets.find((t) => t.id === activeId) ?? null

  function findColumn(ticketId: string): TicketStatus | null {
    for (const status of STATUSES) {
      if (columns[status].some((t) => t.id === ticketId)) return status
    }
    return null
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const from = findColumn(String(active.id))
    const to = over.id as TicketStatus
    if (!from || !STATUSES.includes(to) || from === to) return

    setColumns((prev) => {
      const ticket = prev[from].find((t) => t.id === active.id)
      if (!ticket) return prev
      const moved: UiTicket = { ...ticket, status: to, updatedAt: new Date().toISOString() }
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== active.id),
        [to]: [moved, ...prev[to]],
      }
    })
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {STATUSES.map((status) => (
            <Column key={status} status={status} tickets={columns[status]} onOpen={setSelected} />
          ))}
        </div>
        <DragOverlay>
          {activeTicket ? <TicketCard ticket={activeTicket} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <TicketSheet ticket={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  )
}

function Column({
  status,
  tickets,
  onOpen,
}: {
  status: TicketStatus
  tickets: UiTicket[]
  onOpen: (t: UiTicket) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{statusLabel(status)}</span>
        <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">
          {tickets.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30",
        )}
      >
        {tickets.map((t) => (
          <DraggableCard key={t.id} ticket={t} onOpen={onOpen} />
        ))}
        {tickets.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tickets</p>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ ticket, onOpen }: { ticket: UiTicket; onOpen: (t: UiTicket) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(ticket)}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <TicketCard ticket={ticket} />
    </div>
  )
}

function TicketCard({ ticket, overlay }: { ticket: UiTicket; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-left shadow-sm",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <SeverityBadge severity={ticket.severity} className="text-[10px]" />
        {ticket.source === "watsonx" && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="size-3" /> watsonx
          </span>
        )}
      </div>
      <p className="text-sm font-medium leading-snug">{ticket.title}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileCode2 className="size-3 shrink-0" />
        <span className="truncate">{ticket.specFile.split("/").slice(-2).join("/")}</span>
      </div>
      {ticket.attempts > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {ticket.attempts} heal attempt{ticket.attempts > 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
