import { FadeIn } from '@/components/motion'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
import { ProfileSection } from './ProfileSection'
import { AppearanceSection } from './AppearanceSection'
import { DataExportSection } from './DataExportSection'

export function SettingsPage() {
  return (
    <div className="min-h-dvh bg-bg-deep">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <FadeIn>
          <h1 className="text-3xl gold-foil mb-2">Settings</h1>
          <p className="text-text-secondary mb-10">Manage your account, appearance, and data.</p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <ProfileSection />
        </FadeIn>

        <OrnamentalDivider />

        <FadeIn delay={0.1}>
          <AppearanceSection />
        </FadeIn>

        <OrnamentalDivider />

        <FadeIn delay={0.15}>
          <DataExportSection />
        </FadeIn>
      </div>
    </div>
  )
}
