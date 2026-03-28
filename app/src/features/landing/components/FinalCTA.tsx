// src/features/landing/components/FinalCTA.tsx
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
import { useScrollAnimation } from '../useScrollAnimation'

export function FinalCTA() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 })

  return (
    <section className="py-20 lg:py-32">
      <OrnamentalDivider />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto px-4 sm:px-6 text-center py-16"
      >
        <h2 className="font-[family-name:--font-display] text-3xl sm:text-4xl gold-foil mb-4">
          Your next session starts here.
        </h2>
        <p className="font-[family-name:--font-body] text-text-secondary mb-8">
          Free during beta. No credit card required.
        </p>
        <Link
          to="/login"
          className="inline-block px-8 py-3.5 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-base font-semibold hover:brightness-110 transition-all"
        >
          Start Your Campaign
        </Link>
      </motion.div>
      <OrnamentalDivider />
    </section>
  )
}
