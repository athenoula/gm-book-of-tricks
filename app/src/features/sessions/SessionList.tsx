import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSessions, useUpdateSession, useDeleteSession } from './useSessions'
import type { Session } from '@/lib/types'
import { Button } from '@/components/ui/Button'

const STATUS_STYLES: Record<Session['status'], { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-info/10 text-info border-info/20' },
  in_progress: { label: 'In Progress', className: 'bg-success/10 text-success border-success/20' },
  completed: { label: 'Completed', className: 'bg-text-muted/10 text-text-muted border-text-muted/20' },
}

const NEXT_STATUS: Record<Session['status'], Session['status'] | null> = {
  upcoming: 'in_progress',
  in_progress: 'completed',
  completed: null,
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SessionList({ campaignId }: { campaignId: string }) {
  const { data: sessions, isLoading } = useSessions(campaignId)
  const updateSession = useUpdateSession()
  const deleteSession = useDeleteSession()
  const [showCompleted, setShowCompleted] = useState(false)

  if (isLoading) {
    return <p className="text-text-muted text-sm py-4">Loading sessions...</p>
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
        <p className="text-text-secondary text-sm">
          No sessions yet. Create one to start planning.
        </p>
      </div>
    )
  }

  const active = sessions.filter((s) => s.status !== 'completed')
  const completed = sessions.filter((s) => s.status === 'completed')

  const handleAdvanceStatus = (session: Session) => {
    const next = NEXT_STATUS[session.status]
    if (next) {
      updateSession.mutate({ id: session.id, status: next })
    }
  }

  const handleDelete = (session: Session) => {
    if (window.confirm(`Delete "${session.name}"? This cannot be undone.`)) {
      deleteSession.mutate({ id: session.id, campaignId })
    }
  }

  return (
    <div className="space-y-2">
      {/* Active / upcoming sessions */}
      {active.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onAdvance={() => handleAdvanceStatus(session)}
          onDelete={() => handleDelete(session)}
        />
      ))}

      {/* Completed sessions */}
      {completed.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`}>
              ▸
            </span>
            {completed.length} completed session{completed.length !== 1 ? 's' : ''}
          </button>

          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completed.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onAdvance={() => handleAdvanceStatus(session)}
                  onDelete={() => handleDelete(session)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session,
  onAdvance,
  onDelete,
}: {
  session: Session
  onAdvance: () => void
  onDelete: () => void
}) {
  const status = STATUS_STYLES[session.status]
  const canAdvance = NEXT_STATUS[session.status] !== null

  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border p-4 flex items-center gap-4 group hover:border-border-hover transition-colors">
      {/* Session number */}
      {session.session_number && (
        <div className="w-9 h-9 rounded-[--radius-sm] bg-bg-raised flex items-center justify-center text-sm text-text-muted font-mono flex-shrink-0">
          {session.session_number}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Link
            to="/campaign/$campaignId/session/$sessionId"
            params={{ campaignId: session.campaign_id, sessionId: session.id }}
            className="text-text-heading font-medium truncate hover:text-primary-light transition-colors"
          >
            {session.name}
          </Link>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-[--radius-sm] border flex-shrink-0 ${status.className}`}>
            {status.label}
          </span>
        </div>
        {session.scheduled_at && (
          <p className="text-xs text-text-muted">
            {formatDate(session.scheduled_at)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {canAdvance && (
          <Button variant="ghost" size="sm" onClick={onAdvance}>
            {session.status === 'upcoming' ? 'Start' : 'Complete'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger hover:text-danger">
          ✕
        </Button>
      </div>
    </div>
  )
}
