import type { ComponentType } from "react"
import { Boxes, Database, ImageIcon } from "lucide-react"

const LANES = ["ui", "api", "auth", "edge", "visual"]

function QaIllustration() {
  return (
    <div className="flex h-full w-full flex-1 flex-col justify-center gap-3 px-6 pb-6">
      <div className="flex flex-wrap gap-1.5">
        {LANES.map((l) => (
          <span key={l} className="rounded-md bg-[#E7B24C]/10 px-2 py-0.5 font-mono text-[10px] text-[#E7B24C] ring-1 ring-inset ring-[#E7B24C]/25">
            {l}
          </span>
        ))}
      </div>
      <pre className="flex flex-1 flex-col justify-center overflow-hidden rounded-xl border border-white/8 bg-[#0a0a0c] p-5 font-mono text-sm leading-7 text-white/70">
        <code className="block">
{`test("checkout requires email", `}<span className="text-white/40">{`async ({ page }) => {`}</span>{`
  `}<span className="text-sky-300/80">await</span>{` page.goto(`}<span className="text-emerald-300/80">&quot;/checkout&quot;</span>{`)
  `}<span className="text-sky-300/80">await</span>{` page.getByRole(`}<span className="text-emerald-300/80">&quot;button&quot;</span>{`).click()
  `}<span className="text-sky-300/80">await</span>{` expect(err).toBeVisible()
`}<span className="text-white/40">{`})`}</span>
        </code>
      </pre>
    </div>
  )
}

function HealerIllustration() {
  const lines: [string, string][] = [
    ["-", "if (email) submitOrder(email)"],
    ["+", "if (!isValidEmail(email)) {"],
    ["+", '  setError("Email is required")'],
    ["+", "  return"],
    ["+", "}"],
    ["+", "submitOrder(email)"],
  ]
  return (
    <div className="flex h-full w-full flex-1 flex-col justify-center px-6 pb-6">
      <pre className="flex flex-1 flex-col justify-center overflow-hidden rounded-xl border border-white/8 bg-[#0a0a0c] p-5 font-mono text-sm leading-7">
        {lines.map(([sign, code], i) => (
          <div
            key={i}
            className={
              sign === "+"
                ? "bg-emerald-500/10 text-emerald-300/90"
                : "bg-red-500/10 text-red-300/90"
            }
          >
            <span className="select-none pr-2 opacity-60">{sign}</span>
            {code}
          </div>
        ))}
      </pre>
    </div>
  )
}

function TriageIllustration() {
  return (
    <div className="w-full px-6 pb-6">
      <div className="rounded-xl border border-white/8 bg-[#0a0a0c] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium text-white/80">Checkout accepts empty email</span>
          <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[9px] font-medium text-red-300 ring-1 ring-inset ring-red-500/30">high</span>
        </div>
        <p className="text-[10px] leading-snug text-white/45">
          <span className="text-[#E7B24C]/80">Root cause</span> · form submits without validating the
          email field; the order proceeds with a blank address.
        </p>
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/45 ring-1 ring-inset ring-white/10">Checkout.tsx</span>
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/45 ring-1 ring-inset ring-white/10">validators.ts</span>
        </div>
      </div>
    </div>
  )
}

function BoardIllustration() {
  const cols: [string, number, string][] = [
    ["Backlog", 2, "bg-slate-400/60"],
    ["In progress", 1, "bg-amber-400/70"],
    ["Done", 2, "bg-emerald-400/70"],
  ]
  return (
    <div className="grid w-full grid-cols-3 gap-2 px-6 pb-6">
      {cols.map(([name, n, dot]) => (
        <div key={name} className="rounded-xl border border-white/8 bg-[#0a0a0c] p-2">
          <div className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold uppercase text-white/45">
            <span className={`size-1.5 rounded-full ${dot}`} />
            {name}
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="h-5 rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/8" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BentoCard({
  eyebrow,
  title,
  description,
  children,
  className = "",
  fillPreview = false,
}: {
  eyebrow?: string
  title: string
  description: string
  children?: React.ReactNode
  className?: string
  fillPreview?: boolean
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-[#E7B24C]/30 ${className}`}
    >
      <div className="flex flex-col gap-2 p-6">
        {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-wide text-[#E7B24C]">{eyebrow}</span>}
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-white/45">{description}</p>
      </div>
      {children && <div className={fillPreview ? "mt-auto flex flex-1" : "mt-auto"}>{children}</div>}
    </div>
  )
}

function PlainCard({
  Icon,
  title,
  description,
}: {
  Icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-[#E7B24C]/30">
      <Icon className="mb-4 h-5 w-5 text-white/40 transition-colors group-hover:text-[#E7B24C]" />
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/45">{description}</p>
    </div>
  )
}

export function BentoSection() {
  return (
    <section id="features" className="scroll-mt-24 bg-[#050505] px-4 pb-24 pt-16 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Two Bob modes.
            <br />
            One autonomous QA loop.
          </h2>
          <p className="text-white/45">
            Kintsugi ships as custom Bob modes, rules, skills, and an MCP server — a complete QA agent.
          </p>
        </div>

        {/* Top bento: 3 cols × 2 rows */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
          <BentoCard
            eyebrow="🔧 kintsugi-qa"
            title="Plans, writes & runs the tests"
            description="Crawls your app with analyze_app, designs lane-based E2E plans, and writes Playwright specs — executed through the MCP, never a shell. It can only edit test files."
            className="md:row-span-2"
            fillPreview
          >
            <QaIllustration />
          </BentoCard>

          <BentoCard
            eyebrow="watsonx.ai"
            title="AI-triaged failures"
            description="IBM Granite on watsonx.ai assigns each failure a severity, root cause, and suspected files — with a heuristic fallback."
          >
            <TriageIllustration />
          </BentoCard>

          <BentoCard
            eyebrow="🩹 kintsugi-healer"
            title="Fixes the code, re-verifies green"
            description="Given a failing ticket with full evidence, it repairs the application source and re-runs the test via rerun_test until it passes — and never weakens a test to do it."
            className="md:row-span-2"
            fillPreview
          >
            <HealerIllustration />
          </BentoCard>

          <BentoCard
            title="Live Kanban board"
            description="Failures land as tickets with a screenshot, severity, and triage — moving Backlog → In progress → Done as Bob heals."
          >
            <BoardIllustration />
          </BentoCard>
        </div>

        {/* Bottom row: the IBM stack */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PlainCard
            Icon={Boxes}
            title="MCP + Playwright sandbox"
            description="The Kintsugi MCP server runs Playwright behind a host allowlist and a test-dir jail. Closing Bob's shell is the core safety property."
          />
          <PlainCard
            Icon={Database}
            title="IBM Cloudant"
            description="Plans, runs, results, and tickets persist in IBM Cloudant — the live source of truth behind the board."
          />
          <PlainCard
            Icon={ImageIcon}
            title="IBM Cloud Object Storage"
            description="Screenshots and traces upload to IBM COS as tamper-proof evidence attached to every ticket."
          />
        </div>
      </div>
    </section>
  )
}
