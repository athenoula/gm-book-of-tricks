import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AnimatePresence, ScaleIn, motion } from '@/components/motion'
import { GAME_SYSTEMS } from '@/lib/types'
import { useCreateCampaign } from './useCampaigns'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateCampaignDialog({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gameSystem, setGameSystem] = useState('dnd5e-2024')
  const createCampaign = useCreateCampaign()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const campaign = await createCampaign.mutateAsync({
      name,
      description: description || undefined,
      game_system: gameSystem,
    })
    onClose()
    setName('')
    setDescription('')
    setGameSystem('dnd5e-2024')
    navigate({ to: '/campaign/$campaignId', params: { campaignId: campaign.id } })
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
            <h2 className="text-xl mb-6">New Campaign</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Campaign Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Lost Mines of Phandelver"
                required
                autoFocus
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-medium">
                  Game System
                </label>
                <select
                  value={gameSystem}
                  onChange={(e) => setGameSystem(e.target.value)}
                  className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors"
                >
                  {GAME_SYSTEMS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-medium">
                  Description
                  <span className="text-text-muted ml-1">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your campaign..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCampaign.isPending || !name.trim()}>
                  {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </ScaleIn>
        </div>
      )}
    </AnimatePresence>
  )
}
