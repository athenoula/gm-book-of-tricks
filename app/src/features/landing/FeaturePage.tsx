// src/features/landing/FeaturePage.tsx
import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { showcaseFeatures } from './feature-data'
import { LandingNav } from './components/LandingNav'
import { LandingFooter } from './components/LandingFooter'
import { TimelineDemo } from './demos/TimelineDemo'
import { InitiativeDemo } from './demos/InitiativeDemo'
import { SpellbookDemo } from './demos/SpellbookDemo'
import { GeneratorsDemo } from './demos/GeneratorsDemo'
import { WebClipperDemo } from './demos/WebClipperDemo'

const demoMap: Record<string, React.ComponentType<{ isVisible: boolean }>> = {
  'session-timeline': TimelineDemo,
  'initiative-tracker': InitiativeDemo,
  spellbook: SpellbookDemo,
  generators: GeneratorsDemo,
  'web-clipper': WebClipperDemo,
}

export function FeaturePage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const feature = showcaseFeatures.find((f) => f.slug === slug)

  useEffect(() => {
    if (feature) {
      document.title = feature.seoTitle
    }
    return () => {
      document.title = 'GM Book of Tricks'
    }
  }, [feature])

  if (!feature) {
    return (
      <div className="min-h-dvh bg-bg-deep flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-text-heading mb-4">Feature not found</h1>
          <Link to="/" className="text-primary hover:text-primary-light">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const DemoComponent = demoMap[feature.slug]

  return (
    <div className="min-h-dvh bg-bg-deep">
      <LandingNav />
      <div className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Back link */}
          <Link
            to="/"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-8 inline-block"
          >
            ← All Features
          </Link>

          {/* Feature content */}
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="font-[family-name:--font-label] text-xs tracking-[0.15em] text-primary mb-2">
                {feature.category}
              </p>
              <h1 className="font-[family-name:--font-heading] text-3xl sm:text-4xl text-text-heading mb-6">
                {feature.title}
              </h1>
              <div className="font-[family-name:--font-body] text-text-secondary leading-relaxed space-y-4">
                {feature.longDescription.split('. ').reduce<string[]>((acc, sentence, i, arr) => {
                  // Group sentences into paragraphs of ~2 sentences
                  const last = acc[acc.length - 1]
                  if (last && last.split('. ').length < 2) {
                    acc[acc.length - 1] = last + '. ' + sentence
                  } else {
                    acc.push(sentence)
                  }
                  return acc
                }, []).map((paragraph, i) => (
                  <p key={i}>{paragraph}{paragraph.endsWith('.') ? '' : '.'}</p>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="flex-1 w-full max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {DemoComponent && <DemoComponent isVisible={true} />}
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            className="text-center py-16 mt-12 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-[family-name:--font-heading] text-xl text-text-heading mb-3">
              Try {feature.title}
            </h2>
            <p className="text-text-muted mb-6">Free during beta. No credit card required.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold hover:brightness-110 transition-all"
            >
              Start Your Campaign
            </Link>
          </motion.div>
        </div>
      </div>
      <LandingFooter />
    </div>
  )
}
