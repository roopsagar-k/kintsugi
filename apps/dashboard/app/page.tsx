import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { LandingHeader } from "@/components/landing/landing-header"
import { HeroSection } from "@/components/landing/hero-section"
import { HowSection } from "@/components/landing/how-section"
import { BentoSection } from "@/components/landing/bento-section"
import { BobSection } from "@/components/landing/bob-section"
import { FaqSection } from "@/components/landing/faq-section"
import { LandingFooter } from "@/components/landing/landing-footer"

export const metadata: Metadata = {
  title: "Kintsugi — Autonomous QA for IBM Bob",
  description:
    "Kintsugi turns IBM Bob into an autonomous QA engineer: it reads your codebase, writes Playwright E2E tests, triages every failure with watsonx.ai, and heals the bugs it finds. Built on IBM Cloudant and Cloud Object Storage for the Bob 2.0 Hackathon.",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <LandingHeader />
      <HeroSection />
      <HowSection />
      <BentoSection />
      <BobSection />
      <FaqSection />

      {/* Bottom CTA */}
      <section className="border-t border-white/5 bg-[#050505] px-6 py-24 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">
            Let Bob keep your app green
          </h2>
          <p className="mb-8 text-white/45">
            Open the dashboard, connect a project, and run{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-[#E7B24C]">/qa-run</code> in Bob.
          </p>
          <a
            href="/overview"
            className="inline-flex items-center gap-2 rounded-xl bg-[#E7B24C] px-8 py-3.5 text-sm font-semibold text-[#0b0b0d] shadow-lg shadow-[#E7B24C]/25 transition-all hover:bg-[#f0c064]"
          >
            Open Dashboard <ArrowRight className="size-4" />
          </a>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
