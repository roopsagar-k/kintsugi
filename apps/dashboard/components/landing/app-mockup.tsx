"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const TABS = [
  { label: "Board", src: "/screenshots/board.png" },
  { label: "Overview", src: "/screenshots/overview.png" },
  { label: "Runs", src: "/screenshots/runs.png" },
] as const

export function AppMockup() {
  const [active, setActive] = useState(0)

  return (
    <div className="w-full">
      {/* Tab pills */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1 sm:mb-4 sm:gap-2">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-xl px-3 py-1 text-[11px] font-medium transition-all duration-200 sm:px-4 sm:py-1.5 sm:text-xs",
              i === active ? "bg-white/15 text-white shadow-inner" : "text-white/40 hover:text-white/70",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Framed screenshot */}
      <div className="rounded-2xl border-2 border-[#E7B24C]/40 bg-[#0d0d10] p-1.5 shadow-2xl shadow-black/50 sm:p-3">
        <div className="overflow-hidden rounded-xl">
          <div className="relative aspect-[1903/921] w-full">
            {TABS.map((tab, i) => (
              <Image
                key={tab.label}
                src={tab.src}
                alt={`Kintsugi ${tab.label}`}
                fill
                sizes="(max-width: 1152px) 100vw, 1152px"
                className={cn(
                  "object-cover object-top transition-opacity duration-300",
                  i === active ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                priority={i === 0}
                unoptimized
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
