// src/features/landing/components/LandingNav.tsx
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-[--duration-slow] ${
        scrolled ? 'bg-bg-deep/95 backdrop-blur-sm border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <span className="font-[family-name:--font-display] text-lg gold-foil">
          GM Book of Tricks
        </span>
        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-text-secondary hover:text-text-body transition-colors hidden sm:block"
          >
            Features
          </a>
          <Link
            to="/login"
            className="px-4 py-1.5 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold hover:brightness-110 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  )
}
