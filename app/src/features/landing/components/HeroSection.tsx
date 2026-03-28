// src/features/landing/components/HeroSection.tsx
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { showcaseFeatures } from '../feature-data'
import { TimelineDemo } from '../demos/TimelineDemo'
import { InitiativeDemo } from '../demos/InitiativeDemo'
import { SpellbookDemo } from '../demos/SpellbookDemo'
import { GeneratorsDemo } from '../demos/GeneratorsDemo'
import { WebClipperDemo } from '../demos/WebClipperDemo'
import { QuickReferenceDemo } from '../demos/QuickReferenceDemo'

const demos = [TimelineDemo, InitiativeDemo, SpellbookDemo, GeneratorsDemo, WebClipperDemo, QuickReferenceDemo]

export function HeroSection() {
  const [activeDemoIndex, setActiveDemoIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDemoIndex((prev) => (prev + 1) % demos.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const ActiveDemo = demos[activeDemoIndex]

  return (
    <section className="min-h-dvh flex items-center pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: Copy */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-[family-name:--font-label] text-xs tracking-[0.2em] text-text-muted mb-4">
              FORGED FOR GAME MASTERS
            </p>
            <h1 className="font-[family-name:--font-display] text-4xl sm:text-5xl gold-foil mb-4 leading-tight">
              GM Book of Tricks
            </h1>
            <p className="font-[family-name:--font-body] text-lg text-text-secondary max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
              Session prep, initiative tracking, and in-play reference — so you
              can focus on the story, not the bookkeeping.
            </p>
            <div className="flex gap-3 justify-center lg:justify-start">
              <Link
                to="/login"
                className="px-6 py-3 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold hover:brightness-110 transition-all"
              >
                Start Your Campaign
              </Link>
              <a
                href="#features"
                className="px-6 py-3 rounded-[--radius-md] border border-primary/30 text-primary-light font-[family-name:--font-heading] text-sm hover:bg-primary/5 transition-colors"
              >
                See Features
              </a>
            </div>
          </motion.div>

          {/* Right: Demo */}
          <motion.div
            className="flex-1 w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <ActiveDemo isVisible={true} />
            {/* Demo indicator dots */}
            <div className="flex justify-center gap-2 mt-4">
              {showcaseFeatures.map((f, i) => (
                <button
                  key={f.slug}
                  onClick={() => setActiveDemoIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                    i === activeDemoIndex ? 'bg-primary' : 'bg-text-muted/30'
                  }`}
                  aria-label={`Show ${f.title} demo`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
