import { useState, useEffect } from 'react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#050508]/80 backdrop-blur-xl border-b border-white/[0.04]'
          : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="/"
          className="text-xl text-[var(--text-primary)] hover:text-[var(--accent-amber)] transition-colors italic"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          wingmnn
        </a>

        <div className="flex items-center gap-8">
          <nav
            className="hidden md:flex items-center gap-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <a
              href="#capabilities"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Features
            </a>
            <a
              href="#modes"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              How it works
            </a>
          </nav>
          <a
            href="#waitlist"
            className="text-sm px-5 py-2 rounded-full bg-[var(--accent-amber)] text-[var(--bg-deep)] font-semibold hover:bg-[var(--accent-gold)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Get early access
          </a>
        </div>
      </div>
    </header>
  )
}
