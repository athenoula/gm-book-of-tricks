import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiScrollUnfurled, GiCrossedSwords } from '@/components/ui/icons'
import { useSession, useUpdateSession } from './useSessions'
import { SessionRecap } from './SessionRecap'
import { SessionTimeline } from '@/features/timeline/SessionTimeline'
import { InitiativeTracker } from '@/features/initiative/InitiativeTracker'
import { useAddTimelineBlock } from '@/features/timeline/useTimelineBlocks'
import { useTimelineBlocks } from '@/features/timeline/useTimelineBlocks'
import { useState } from 'react'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-info/10 text-info border-info/20' },
  in_progress: { label: 'In Progress', className: 'bg-success/10 text-success border-success/20' },
  completed: { label: 'Completed', className: 'bg-text-muted/10 text-text-muted border-text-muted/20' },
}

export function SessionPage({ sessionId, campaignId }: { sessionId: string; campaignId: string }) {
  const { data: session, isLoading } = useSession(sessionId)
  const updateSession = useUpdateSession()
  const addBlock = useAddTimelineBlock()
  const { data: blocks } = useTimelineBlocks(sessionId)
  const [showInitiative, setShowInitiative] = useState(false)

  if (isLoading || !session) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-3 torch-flicker"><GameIcon icon={GiScrollUnfurled} size="3xl" /></div>
        <p className="text-text-muted text-sm">Loading session...</p>
      </div>
    )
  }

  const status = STATUS_LABELS[session.status]

  const handleAdvanceStatus = () => {
    const next = session.status === 'upcoming' ? 'in_progress' : session.status === 'in_progress' ? 'completed' : null
    if (next) {
      updateSession.mutate({ id: session.id, status: next as 'upcoming' | 'in_progress' | 'completed' })
    }
  }

  const handleSaveToTimeline = (battle: { title: string; snapshot: Record<string, unknown> }) => {
    const maxSort = blocks ? Math.max(0, ...blocks.map((b) => b.sort_order)) + 1 : 0
    addBlock.mutate({
      session_id: sessionId,
      campaign_id: campaignId,
      block_type: 'battle',
      title: battle.title,
      content_snapshot: battle.snapshot,
      sort_order: maxSort,
    })
  }

  return (
    <div>
      {/* Session header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {session.session_number && (
                <span className="text-sm text-text-muted font-mono">#{session.session_number}</span>
              )}
              <h2 className="text-2xl gold-foil">{session.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-[--radius-sm] border ${status.className}`}>
                {status.label}
              </span>
              {session.status !== 'completed' && (
                <Button size="sm" variant="ghost" onClick={handleAdvanceStatus}>
                  {session.status === 'upcoming' ? 'Start Session' : 'Complete Session'}
                </Button>
              )}
            </div>
          </div>

          <Button
            size="sm"
            variant={showInitiative ? 'primary' : 'secondary'}
            onClick={() => setShowInitiative(!showInitiative)}
          >
            <GameIcon icon={GiCrossedSwords} size="sm" /> {showInitiative ? 'Hide' : 'Initiative'}
          </Button>
        </div>
      </div>

      {/* Recap (only visible on completed sessions) */}
      <SessionRecap session={session} />

      {/* Initiative tracker slide-out */}
      {showInitiative && (
        <div className="mb-6 bg-bg-raised rounded-[--radius-lg] border border-border p-4 max-md:fixed max-md:bottom-0 max-md:inset-x-0 max-md:z-30 max-md:rounded-t-xl max-md:border-t max-md:border-border max-md:max-h-[70vh] max-md:overflow-y-auto">
          <InitiativeTracker
            campaignId={campaignId}
            sessionId={sessionId}
            onSaveToTimeline={handleSaveToTimeline}
          />
        </div>
      )}

      {/* Timeline */}
      <SessionTimeline sessionId={sessionId} campaignId={campaignId} />
    </div>
  )
}
