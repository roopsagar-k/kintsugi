import type { NextRequest } from "next/server"
import { getDoc } from "@/lib/cloudant"
import { notFound } from "@/lib/http"
import type { Report } from "@/lib/types"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/reports/:id — serve a generated run report as HTML.
// Public by report id (non-sensitive summary) so the link opens in a browser.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const report = await getDoc<Report>(decodeURIComponent(id))
  if (!report || report.type !== "report") return notFound("Report not found.")

  return new Response(report.html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
