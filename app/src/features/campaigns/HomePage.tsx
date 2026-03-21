import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { StaggerList, StaggerItem } from '@/components/motion'
import { useCampaigns } from './useCampaigns'
import { CampaignCard } from './CampaignCard'
import { CreateCampaignDialog } from './CreateCampaignDialog'
import { InspirationBoard } from '@/features/scratchpad/InspirationBoard'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'

export function HomePage() {
  const { user, signOut } = useAuth()
  const { data: campaigns, isLoading, error } = useCampaigns()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="min-h-dvh bg-bg-deep">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-10 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl">Your Campaigns</h2>
          <Button size="md" onClick={() => setShowCreate(true)}>
            + New Campaign
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3 torch-flicker"><GameIcon icon={GiRollingDices} size="3xl" /></div>
            <p className="text-text-muted text-sm">Loading campaigns...</p>
          </div>
        )}

        {error && (
          <div className="bg-danger-dim/30 border border-danger/20 rounded-[--radius-md] p-4 text-danger text-sm">
            Failed to load campaigns: {error.message}
          </div>
        )}

        {campaigns && campaigns.length === 0 && (
          <div className="bg-bg-base rounded-[--radius-lg] border border-border p-12 text-center">
            <div className="text-4xl mb-4"><GameIcon icon={GiRollingDices} size="3xl" /></div>
            <h3 className="text-lg mb-2">No campaigns yet</h3>
            <p className="text-text-secondary text-sm mb-6">
              Create your first campaign to start prepping sessions.
            </p>
            <Button onClick={() => setShowCreate(true)}>Create Campaign</Button>
          </div>
        )}

        {campaigns && campaigns.length > 0 && (
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <StaggerItem key={c.id}>
                <CampaignCard campaign={c} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}

        <OrnamentalDivider />

        {/* Global Inspiration Inbox */}
        <div className="mt-12">
          <InspirationBoard isGlobal />
        </div>
      </main>

      <CreateCampaignDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
