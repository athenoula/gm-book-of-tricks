// src/features/landing/components/MoreFeaturesGrid.tsx
import { motion } from 'motion/react'
import { gridFeatures } from '../feature-data'
import { useScrollAnimation } from '../useScrollAnimation'

export function MoreFeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })

  return (
    <section className="py-12 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="font-[family-name:--font-heading] text-2xl text-text-heading text-center mb-10">
          And there's more...
        </h2>
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {gridFeatures.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="p-4 rounded-[--radius-md] border border-border bg-bg-base/30 hover:border-primary/20 hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className="text-primary/60 group-hover:text-primary transition-colors shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <h3 className="font-[family-name:--font-heading] text-sm text-text-heading mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
