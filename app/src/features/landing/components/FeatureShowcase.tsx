// src/features/landing/components/FeatureShowcase.tsx
import { showcaseFeatures } from '../feature-data'
import { FeatureRow } from './FeatureRow'
import { TimelineDemo } from '../demos/TimelineDemo'
import { InitiativeDemo } from '../demos/InitiativeDemo'
import { SpellbookDemo } from '../demos/SpellbookDemo'
import { GeneratorsDemo } from '../demos/GeneratorsDemo'
import { WebClipperDemo } from '../demos/WebClipperDemo'
import { useScrollAnimation } from '../useScrollAnimation'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'

const demoComponents = [TimelineDemo, InitiativeDemo, SpellbookDemo, GeneratorsDemo, WebClipperDemo]

function ShowcaseRow({ index }: { index: number }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, once: false })
  const feature = showcaseFeatures[index]
  const DemoComponent = demoComponents[index]

  return (
    <FeatureRow
      ref={ref}
      feature={feature}
      demo={<DemoComponent isVisible={isVisible} />}
      reversed={index % 2 === 1}
      isVisible={isVisible}
    />
  )
}

export function FeatureShowcase() {
  return (
    <section id="features" className="py-12 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {showcaseFeatures.map((_, index) => (
          <div key={showcaseFeatures[index].slug}>
            <ShowcaseRow index={index} />
            {index < showcaseFeatures.length - 1 && <OrnamentalDivider opacity={0.15} />}
          </div>
        ))}
      </div>
    </section>
  )
}
