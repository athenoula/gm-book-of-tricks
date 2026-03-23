import { useState, useEffect } from 'react'
import { useTutorial } from '@/lib/tutorial'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AnimatePresence, ScaleIn, motion } from '@/components/motion'
import { useCreateSession } from './useSessions'

interface Props {
  campaignId: string
  open: boolean
  onClose: () => void
}

export function CreateSessionDialog({ campaignId, open, onClose }: Props) {
  const [name, setName] = useState('')
  const [sessionNumber, setSessionNumber] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const createSession = useCreateSession()
  const { prefillData, isActive } = useTutorial()

  useEffect(() => {
    if (open && isActive && prefillData) {
      if (prefillData.name) setName(prefillData.name as string)
    }
  }, [open, isActive, prefillData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createSession.mutateAsync({
      campaign_id: campaignId,
      name,
      session_number: sessionNumber ? parseInt(sessionNumber, 10) : undefined,
      scheduled_at: scheduledAt || undefined,
    })
    onClose()
    setName('')
    setSessionNumber('')
    setScheduledAt('')
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <ScaleIn className="relative bg-bg-base rounded-[--radius-xl] border border-border shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl mb-6">New Session</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Session Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Siege of Ashenmoor"
                required
                autoFocus
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Session #"
                  type="number"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                  placeholder="14"
                  min={1}
                />

                <Input
                  label="Scheduled"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSession.isPending || !name.trim()}>
                  {createSession.isPending ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </form>
          </ScaleIn>
        </div>
      )}
    </AnimatePresence>
  )
}
