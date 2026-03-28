// src/features/landing/components/FeatureRow.tsx
import { forwardRef } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import type { ShowcaseFeature } from '../feature-data'

interface FeatureRowProps {
  feature: ShowcaseFeature
  demo: React.ReactNode
  reversed: boolean
  isVisible: boolean
}

export const FeatureRow = forwardRef<HTMLDivElement, FeatureRowProps>(
  function FeatureRow({ feature, demo, reversed, isVisible }, ref) {

  const copy = (
    <div className="flex-1">
      <p className="font-[family-name:--font-label] text-xs tracking-[0.15em] text-primary mb-2">
        {feature.category}
      </p>
      <h3 className="font-[family-name:--font-heading] text-2xl text-text-heading mb-3">
        {feature.title}
      </h3>
      <p className="font-[family-name:--font-body] text-text-secondary leading-relaxed mb-4">
        {feature.shortDescription}
      </p>
      <Link
        to="/features/$slug"
        params={{ slug: feature.slug }}
        className="text-primary-light font-[family-name:--font-heading] text-sm hover:underline"
      >
        Learn more →
      </Link>
    </div>
  )

  const demoEl = <div className="flex-1 w-full">{demo}</div>

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="py-12 lg:py-16"
    >
      <div
        className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-12 ${
          reversed ? 'lg:flex-row-reverse' : ''
        }`}
      >
        {/* On mobile, always show copy first */}
        <div className="flex-1 order-1 lg:order-none">{copy}</div>
        <div className="flex-1 w-full order-2 lg:order-none">{demoEl}</div>
      </div>
    </motion.div>
  )
}
)
