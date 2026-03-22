import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SceneEditor } from '@/features/timeline/SceneEditor'
import { useUpdateSessionRecap } from './useSessions'
import type { Session } from '@/lib/types'

interface Props {
  session: Session
}

export function SessionRecap({ session }: Props) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const updateRecap = useUpdateSessionRecap()

  if (session.status !== 'completed') return null

  const hasRecap = !!session.recap

  const handleStartEdit = () => {
    setEditContent(session.recap || '')
    setEditing(true)
  }

  const handleSave = () => {
    updateRecap.mutate(
      { id: session.id, recap: editContent },
      { onSuccess: () => setEditing(false) },
    )
  }

  const handleCancel = () => {
    setEditing(false)
  }

  if (!hasRecap && !editing) {
    return (
      <div className="mb-6 bg-bg-base rounded-[--radius-lg] border border-border p-6 text-center">
        <p className="text-text-secondary text-sm mb-3">Session complete — write a recap?</p>
        <Button size="sm" onClick={handleStartEdit}>Write Recap</Button>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-bg-base rounded-[--radius-lg] border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-heading">Session Recap</h3>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={updateRecap.isPending}>
                {updateRecap.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleStartEdit}>Edit</Button>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        <SceneEditor
          content={editing ? editContent : session.recap}
          editable={editing}
          onChange={setEditContent}
        />
      </div>
    </div>
  )
}
