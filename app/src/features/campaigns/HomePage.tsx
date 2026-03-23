import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices, GiPuzzle } from '@/components/ui/icons'
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

        <OrnamentalDivider />

        {/* Browser Extension */}
        <div className="mt-12 bg-bg-base rounded-[--radius-lg] border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-1">
              <GameIcon icon={GiPuzzle} size="xl" className="text-primary-light" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Web Clipper Extension
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Clip web content straight to your Inspiration Board while browsing. Save pages, text snippets, and images from any website with one click.
              </p>
              <div className="text-xs text-text-muted space-y-1.5 mb-4">
                <p className="font-medium text-text-secondary">How to install:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Download and unzip the file below</li>
                  <li>Open Chrome and go to <span className="font-mono text-text-body">chrome://extensions</span></li>
                  <li>Turn on <span className="text-text-body">Developer mode</span> (top right toggle)</li>
                  <li>Click <span className="text-text-body">Load unpacked</span> and select the <span className="font-mono text-text-body">extension</span> folder</li>
                  <li>Click the puzzle icon in your toolbar and pin Book of Tricks Clipper</li>
                </ol>
              </div>
              <a
                href={`${import.meta.env.BASE_URL}book-of-tricks-clipper.zip`}
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[--radius-md] bg-primary/10 border border-primary/30 text-primary-light text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Download Extension
              </a>
            </div>
          </div>
        </div>
      </main>

      <CreateCampaignDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
