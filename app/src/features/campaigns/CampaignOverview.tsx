import { useState } from 'react'
import { useCampaign } from './useCampaigns'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { GAME_SYSTEMS } from '@/lib/types'
import { SessionList } from '@/features/sessions/SessionList'
import { CreateSessionDialog } from '@/features/sessions/CreateSessionDialog'

import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
import { CampaignFiles } from './CampaignFiles'
import { PlotThreads } from '@/features/threads/PlotThreads'
import { PartyTreasure } from '@/features/inventory/PartyTreasure'

export function CampaignOverview({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(campaignId)
  const [showCreateSession, setShowCreateSession] = useState(false)

  if (isLoading || !campaign) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-3 torch-flicker"><GameIcon icon={GiRollingDices} size="3xl" /></div>
        <p className="text-text-muted text-sm">Loading campaign...</p>
      </div>
    )
  }

  const system = GAME_SYSTEMS.find((s) => s.value === campaign.game_system)

  return (
    <div>
      {/* Campaign header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="text-2xl gold-foil">{campaign.name}</h2>
          <span className="text-xs text-text-muted bg-bg-raised px-2.5 py-1 rounded-[--radius-sm] border border-border whitespace-nowrap mt-1">
            {system?.label ?? campaign.game_system}
          </span>
        </div>
        {campaign.description && (
          <p className="text-text-secondary">{campaign.description}</p>
        )}
      </div>

      <OrnamentalDivider />

      {/* Sessions section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl">Sessions</h3>
          <Button size="sm" onClick={() => setShowCreateSession(true)}>
            + New Session
          </Button>
        </div>
        <SessionList campaignId={campaignId} />
      </div>

      {/* Plot threads */}
      <div className="mb-8">
        <PlotThreads campaignId={campaignId} />
      </div>

      {/* Party treasure */}
      <div className="mb-8">
        <PartyTreasure campaignId={campaignId} />
      </div>

      <OrnamentalDivider />

      {/* Campaign files */}
      <div className="mb-8">
        <CampaignFiles campaignId={campaignId} />
      </div>

      <CreateSessionDialog
        campaignId={campaignId}
        open={showCreateSession}
        onClose={() => setShowCreateSession(false)}
      />
    </div>
  )
}
