// src/features/landing/LandingPage.tsx — CORRECTED VERSION (no atmosphere layers, App.tsx already renders those)
import { LandingNav } from './components/LandingNav'
import { HeroSection } from './components/HeroSection'
import { TrustStrip } from './components/TrustStrip'
import { FeatureShowcase } from './components/FeatureShowcase'
import { MoreFeaturesGrid } from './components/MoreFeaturesGrid'
import { FinalCTA } from './components/FinalCTA'
import { LandingFooter } from './components/LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg-deep">
      <LandingNav />
      <HeroSection />
      <TrustStrip />
      <FeatureShowcase />
      <MoreFeaturesGrid />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
