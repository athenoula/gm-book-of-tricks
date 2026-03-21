import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiHoodedFigure } from '@/components/ui/icons'
import { ScaleIn } from '@/components/motion'
import { useMonsterToNPC } from './useMonsters'
import type { Monster } from '@/lib/types'

export function MonsterToNPCDialog({
  monster,
  campaignId,
  onClose,
}: {
  monster: Monster
  campaignId: string
  onClose: () => void
}) {
  const [name, setName] = useState(monster.name)
  const [personality, setPersonality] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useMonsterToNPC()

  useEffect(() => {
    if (mutation.isSuccess) {
      onClose()
    }
  }, [mutation.isSuccess, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      campaign_id: campaignId,
      name,
      race: monster.type || null,
      personality: personality || null,
      notes: notes || null,
      stat_block: (monster.stat_block as Record<string, unknown>) || {},
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <ScaleIn>
        <form
          onSubmit={handleSubmit}
          className="relative bg-stone-800 border border-stone-700 rounded-[--radius-lg] p-6 w-full max-w-md space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <GameIcon icon={GiHoodedFigure} size="lg" />
            <h3 className="text-lg text-text-heading font-heading">Convert to NPC</h3>
          </div>

          <p className="text-xs text-text-muted">
            Based on: {monster.name} ({monster.size} {monster.type})
          </p>

          <Input
            label="NPC Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Personality</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe their personality..."
              rows={3}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? 'Saving...' : 'Save as NPC'}
            </Button>
          </div>
        </form>
      </ScaleIn>
    </div>
  )
}
