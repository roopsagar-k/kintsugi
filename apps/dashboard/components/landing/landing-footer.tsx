import Link from "next/link"
import { KintsugiMark } from "@/components/kintsugi-logo"

export function LandingFooter() {
  return (
    <footer className="relative mx-auto w-full max-w-7xl bg-[#050505] px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <div
        className="rounded-[2rem] p-px"
        style={{
          background:
            "linear-gradient(135deg, rgba(231,178,76,0.35), rgba(231,178,76,0.06))",
        }}
      >
        <div className="rounded-[calc(2rem-1px)] bg-[#0a0a0c] px-6 py-8 shadow-2xl shadow-black/40 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex flex-col items-center justify-center gap-5 py-10 text-center sm:py-12">
            <Link href="/" className="flex items-center gap-2">
              <KintsugiMark className="size-9" />
              <span className="text-xl font-extrabold tracking-wide text-white">KINTSUGI</span>
            </Link>
            <p className="max-w-md text-sm leading-6 text-white/45">
              An autonomous QA engineer for IBM Bob. Reads your code, writes E2E tests, triages
              failures with watsonx.ai, and heals the bugs it finds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/45">
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#how" className="transition hover:text-white">The loop</a>
              <a href="#bob" className="transition hover:text-white">Bob</a>
              <a href="#faq" className="transition hover:text-white">FAQ</a>
              <a href="/overview" className="transition hover:text-white">Dashboard</a>
            </div>
          </div>

          <div className="border-t border-dashed border-white/10 pt-5 text-center text-sm text-white/40 sm:flex sm:items-center sm:justify-between sm:text-left">
            <p>&copy; 2026 Kintsugi · Urushi Labs</p>
            <p className="mt-2 sm:mt-0">Built for the IBM Bob 2.0 Hackathon</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
