// Kintsugi mark — a dark tile mended with a golden seam (the art of kintsugi).
export function KintsugiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kg-tile" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2b2b30" />
          <stop offset="1" stopColor="#0b0b0d" />
        </linearGradient>
        <linearGradient id="kg-gold" x1="4" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCE7A1" />
          <stop offset="0.5" stopColor="#E7B24C" />
          <stop offset="1" stopColor="#B9822B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#kg-tile)" />
      <rect width="31" height="31" x="0.5" y="0.5" rx="7.5" fill="none" stroke="#ffffff" strokeOpacity="0.06" />
      {/* the golden kintsugi seam + branches */}
      <path
        d="M16 3.5 L12.6 11 L17.8 15.4 L11.2 21 L15.6 28.5"
        stroke="url(#kg-gold)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17.8 15.4 L23.6 12.2" stroke="url(#kg-gold)" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M12.6 11 L7.6 8.8" stroke="url(#kg-gold)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.85" />
      <path d="M11.2 21 L6.6 22.6" stroke="url(#kg-gold)" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  )
}
