"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, Menu, X } from "lucide-react"
import { KintsugiMark } from "@/components/kintsugi-logo"
import { cn } from "@/lib/utils"

const NAV = [
  { label: "Features", href: "#features" },
  { label: "The loop", href: "#how" },
  { label: "Bob", href: "#bob" },
  { label: "FAQ", href: "#faq" },
]

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <KintsugiMark className="size-8" />
      <span className="text-lg font-extrabold tracking-wide text-white">KINTSUGI</span>
    </Link>
  )
}

function OpenAppButton({ className }: { className?: string }) {
  return (
    <a
      href="/overview"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl bg-[#E7B24C] px-5 py-2.5 text-sm font-semibold text-[#0b0b0d] shadow-sm transition-all hover:bg-[#f0c064]",
        className,
      )}
    >
      Open Dashboard
      <ChevronRight className="size-4" />
    </a>
  )
}

export function LandingHeader() {
  const [isShrunk, setIsShrunk] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMenuOpen(false)
    }
    const handleScroll = () => setIsShrunk(window.scrollY > 80)
    handleResize()
    handleScroll()
    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  if (isMobile) {
    return (
      <div className="fixed inset-x-0 top-0 z-50">
        <div
          className={cn(
            "flex w-full items-center justify-between border-b px-4 py-4 transition-all duration-300",
            menuOpen || isShrunk
              ? "border-white/10 bg-[#050505]/85 backdrop-blur-xl"
              : "border-transparent bg-transparent",
          )}
        >
          <Logo />
          <button
            className="rounded-full p-2 text-white/70 transition hover:text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        <div
          className={cn(
            "overflow-hidden border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl transition-all duration-300",
            menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="flex w-full flex-col gap-3 px-4 py-5">
            {NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <OpenAppButton className="mt-2 w-full justify-center" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className={cn(
          "flex w-full max-w-6xl items-center justify-between border border-white/10 bg-[#0a0a0c]/80 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300",
          isShrunk ? "max-w-4xl rounded-2xl px-6 py-3" : "rounded-2xl px-8 py-4",
        )}
      >
        <Logo />
        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-8">
            {NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/50 transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <OpenAppButton />
        </div>
      </div>
    </div>
  )
}
