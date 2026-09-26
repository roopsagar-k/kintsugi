import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "Do I need to write any tests myself?",
    a: "No. In kintsugi-qa mode, Bob reads your app, plans lane-based coverage, and writes the Playwright specs for you. You just run /qa-run.",
  },
  {
    q: "How does Bob run tests without a shell?",
    a: "Every test runs through the Kintsugi MCP server, which executes Playwright inside a sandbox with a host allowlist and a test-directory jail. Neither Bob mode has shell access — the MCP is the only way to launch a browser.",
  },
  {
    q: "What does watsonx.ai do?",
    a: "It triages every failure — assigning a severity, a plain-English root cause, and the suspected files. If watsonx is unavailable, Kintsugi falls back to a deterministic heuristic so the board never blocks.",
  },
  {
    q: "Will the healer weaken tests just to go green?",
    a: "No. kintsugi-healer can only edit application source — it cannot touch anything under .kintsugi/tests. After three failed attempts on a ticket it stops and marks it NeedsHuman with its findings.",
  },
  {
    q: "Which IBM services does it use?",
    a: "watsonx.ai for triage, IBM Cloudant for all data (plans, runs, results, tickets), and IBM Cloud Object Storage for screenshots and traces.",
  },
  {
    q: "Is it tied to one app?",
    a: "No — point it at any web app. The bundled demo target is ShopLite, a small storefront with five seeded bugs that produce five triaged tickets end-to-end.",
  },
]

export function FaqSection() {
  return (
    <section
      id="faq"
      className="relative mx-auto w-full max-w-7xl scroll-mt-24 border-t border-white/5 bg-[#050505] px-5 py-20 sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="lg:pt-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E7B24C]/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E7B24C]">
            FAQ
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-balance sm:text-4xl lg:text-5xl">
            <span className="text-white">Frequently asked </span>
            <span className="text-[#E7B24C]">questions</span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-white/45 sm:text-base sm:leading-8">
            Everything about how Kintsugi turns IBM Bob into an autonomous QA engineer — how it
            runs, what it can do, and where to start.
          </p>
        </div>

        <div>
          <Accordion defaultValue={["item-0"]} className="gap-5">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={faq.q}
                value={`item-${index}`}
                className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.02] px-6 not-last:border-b data-open:border-[#E7B24C]/40"
              >
                <AccordionTrigger className="py-6 text-base font-medium text-white no-underline hover:no-underline sm:text-[1.05rem]">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-8 text-white/50">
                  <p>{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
