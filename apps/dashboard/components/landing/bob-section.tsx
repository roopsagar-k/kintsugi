import { FolderPlus, PlayCircle, PenLine, Wrench, FileText } from "lucide-react"

const SKILLS = [
  {
    Icon: FolderPlus,
    cmd: "/qa-init",
    mode: "kintsugi-qa",
    body: "Scaffolds the .kintsugi workspace and checks Playwright prerequisites — sets QA up without running anything yet.",
  },
  {
    Icon: PlayCircle,
    cmd: "/qa-run",
    mode: "kintsugi-qa",
    body: "The full loop: plans, writes, and runs Playwright specs through the MCP, then opens a triaged ticket for every failure.",
  },
  {
    Icon: PenLine,
    cmd: "/qa-test-writer",
    mode: "kintsugi-qa",
    body: "The spec-authoring conventions — structure, imports, selectors, assertions — auto-applied while Bob writes test files.",
  },
  {
    Icon: Wrench,
    cmd: "/qa-heal",
    mode: "kintsugi-healer",
    body: "Diagnoses and fixes the application code behind a failing ticket, then re-verifies through the MCP until it's green.",
  },
  {
    Icon: FileText,
    cmd: "/qa-report",
    mode: "any mode",
    body: "Generates an HTML run report and summarises the latest run and the state of the ticket board.",
  },
]

export function BobSection() {
  return (
    <section id="bob" className="scroll-mt-24 border-t border-white/5 bg-[#050505] px-4 py-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E7B24C]/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E7B24C]">
            Built for IBM Bob
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Five skills, wired into Bob
          </h2>
          <p className="mx-auto max-w-2xl text-white/45">
            Kintsugi installs two custom modes, five slash-command skills, mode rules, and an MCP
            server — so QA lives inside Bob, right where you already work.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map(({ Icon, cmd, mode, body }) => (
            <div
              key={cmd}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-[#E7B24C]/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#E7B24C]/10 text-[#E7B24C] ring-1 ring-inset ring-[#E7B24C]/25">
                  <Icon className="size-4.5" />
                </div>
                <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/40 ring-1 ring-inset ring-white/10">
                  {mode}
                </span>
              </div>
              <h3 className="mb-2 font-mono text-sm font-semibold text-white transition-colors group-hover:text-[#E7B24C]">
                {cmd}
              </h3>
              <p className="text-[13px] leading-relaxed text-white/45">{body}</p>
            </div>
          ))}

          {/* Modes recap card */}
          <div className="rounded-2xl border border-[#E7B24C]/25 bg-[#E7B24C]/[0.04] p-6">
            <h3 className="mb-3 text-sm font-semibold text-white">Two guardrailed modes</h3>
            <ul className="flex flex-col gap-3 text-[13px] text-white/55">
              <li className="flex gap-2">
                <span>🔧</span>
                <span>
                  <span className="font-medium text-white/80">kintsugi-qa</span> — may edit test specs
                  only. No shell.
                </span>
              </li>
              <li className="flex gap-2">
                <span>🩹</span>
                <span>
                  <span className="font-medium text-white/80">kintsugi-healer</span> — may edit app
                  code, never tests. No shell.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
