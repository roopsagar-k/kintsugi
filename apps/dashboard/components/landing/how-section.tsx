import { ScanSearch, FileCode2, Bug, HeartPulse } from "lucide-react"

const STEPS = [
  {
    Icon: ScanSearch,
    title: "Analyze",
    body: "analyze_app crawls the running app into a route map and Bob reads the source.",
  },
  {
    Icon: FileCode2,
    title: "Plan & write",
    body: "Bob designs lane-based E2E plans; subagents author Playwright specs.",
  },
  {
    Icon: Bug,
    title: "Run & triage",
    body: "Tests run in the MCP sandbox. Failures → screenshot → watsonx triage → ticket.",
  },
  {
    Icon: HeartPulse,
    title: "Heal",
    body: "The healer fixes the app code and re-runs each test until the board is green.",
  },
]

export function HowSection() {
  return (
    <section id="how" className="scroll-mt-24 border-t border-white/5 bg-[#050505] px-4 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E7B24C]/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E7B24C]">
            The loop
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
            From <span className="text-white/45">red</span> to green, on its own
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, body }, i) => (
            <div key={title} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#E7B24C]/10 text-[#E7B24C] ring-1 ring-inset ring-[#E7B24C]/25">
                  <Icon className="size-4.5" />
                </div>
                <span className="font-mono text-xs text-white/30">0{i + 1}</span>
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-white">{title}</h3>
              <p className="text-[13px] leading-relaxed text-white/45">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
