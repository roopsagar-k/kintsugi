import { KanbanBoard } from "@/components/board/kanban-board"
import { getBoardTickets } from "@/lib/dashboard-data"

// Always fetch fresh from Cloudant (tickets change as Bob runs).
export const dynamic = "force-dynamic"

export default async function BoardPage() {
  const tickets = await getBoardTickets()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <p className="text-sm text-muted-foreground">
          Failure tickets triaged by Bob. Drag a card to move it between stages, or click to inspect.
          {tickets.length === 0 && " No tickets yet — run /qa-run to populate the board."}
        </p>
      </div>
      <KanbanBoard tickets={tickets} />
    </div>
  )
}
