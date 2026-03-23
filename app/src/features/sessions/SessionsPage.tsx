import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiScrollUnfurled } from '@/components/ui/icons'
import { SessionList } from './SessionList'
import { CreateSessionDialog } from './CreateSessionDialog'

export function SessionsPage({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div data-tutorial="sessions-list">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiScrollUnfurled} size="xl" /> Sessions</h2>
        <Button size="sm" onClick={() => setShowCreate(true)} data-tutorial="create-session">
          + New Session
        </Button>
      </div>

      <SessionList campaignId={campaignId} />

      <CreateSessionDialog
        campaignId={campaignId}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
