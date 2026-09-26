import { ArrowRight } from "lucide-react"
import { AppMockup } from "./app-mockup"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#050505] px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-32 lg:pt-40">
      {/* Background glow (gold — kintsugi seam) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(231,178,76,0.16),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#E7B24C]/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        {/* Badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E7B24C]/30 bg-[#E7B24C]/10 px-3 py-1.5 text-[11px] font-medium text-[#E7B24C] sm:mb-8 sm:px-4 sm:text-xs">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#E7B24C]" />
          Autonomous QA for IBM Bob · Built for the Bob 2.0 Hackathon
        </div>

        {/* Headline */}
        <h1 className="mb-4 max-w-3xl text-[2rem] font-bold leading-[1.1] tracking-tight text-white sm:mb-5 sm:text-4xl lg:text-[56px]">
          Ship features. Bob finds the bugs{" "}
          <span className="text-white/45">and mends them in gold.</span>
        </h1>

        {/* Body */}
        <p className="mb-7 max-w-xl text-sm leading-relaxed text-white/45 sm:mb-9 sm:text-base">
          Kintsugi turns IBM Bob into an autonomous QA engineer. It reads your codebase, writes
          Playwright end-to-end tests, triages every failure with watsonx.ai, and heals the code
          until the suite is green.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/overview"
              className="inline-flex items-center gap-2 rounded-xl bg-[#E7B24C] px-5 py-2.5 text-sm font-semibold text-[#0b0b0d] shadow-lg shadow-[#E7B24C]/25 transition-all hover:bg-[#f0c064] sm:px-6 sm:py-3"
            >
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:text-white sm:px-6 sm:py-3"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Social proof */}
        <p className="mt-4 text-xs text-white/25">
          Powered by watsonx.ai · IBM Cloudant · IBM Cloud Object Storage · No test-writing required
        </p>

        {/* App mockup */}
        <div className="mt-10 sm:mt-16">
          <AppMockup />
        </div>
      </div>
    </section>
  )
}
