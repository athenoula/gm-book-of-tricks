// src/features/landing/components/TrustStrip.tsx
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'

export function TrustStrip() {
  return (
    <section className="py-8">
      <OrnamentalDivider opacity={0.2} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-text-muted">
          <span className="font-[family-name:--font-label] text-xs tracking-wider">
            FREE DURING BETA
          </span>
          <span className="hidden sm:block text-text-muted/30">·</span>
          <span className="font-[family-name:--font-label] text-xs tracking-wider">
            BUILT BY A GM, FOR GMs
          </span>
          <span className="hidden sm:block text-text-muted/30">·</span>
          <span className="font-[family-name:--font-label] text-xs tracking-wider">
            D&D 5E & SYSTEM-AGNOSTIC
          </span>
        </div>
      </div>
      <OrnamentalDivider opacity={0.2} />
    </section>
  )
}
