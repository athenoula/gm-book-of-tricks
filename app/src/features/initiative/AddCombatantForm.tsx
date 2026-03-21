import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { rollD20 } from '@/lib/dnd'
import { useAddCombatant } from './useCombatants'

interface Props {
  campaignId: string
  sessionId?: string
  onAdded?: () => void
}

export function AddCombatantForm({ campaignId, sessionId, onAdded }: Props) {
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('10')
  const [isPlayer, setIsPlayer] = useState(false)
  const addCombatant = useAddCombatant()

  const handleRoll = () => {
    setInitiative(String(rollD20()))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hpVal = parseInt(hp, 10) || 0

    await addCombatant.mutateAsync({
      campaign_id: campaignId,
      session_id: sessionId,
      name,
      initiative: parseInt(initiative, 10) || 0,
      hp_current: hpVal,
      hp_max: hpVal,
      armor_class: parseInt(ac, 10) || 10,
      is_player: isPlayer,
    })

    setName('')
    setInitiative('')
    setHp('')
    setAc('10')
    onAdded?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Goblin Archer"
        required
        autoFocus
      />

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Initiative</label>
          <div className="flex gap-1">
            <input
              type="number"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
              placeholder="—"
              required
              className="w-full px-2 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-center focus:outline-none focus:border-border-active transition-colors"
            />
            <button
              type="button"
              onClick={handleRoll}
              className="px-2 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-primary-light hover:bg-bg-surface transition-colors cursor-pointer text-sm"
              title="Roll d20"
            >
              <GameIcon icon={GiRollingDices} size="sm" />
            </button>
          </div>
        </div>

        <Input
          label="HP"
          type="number"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          placeholder="30"
          min={0}
        />

        <Input
          label="AC"
          type="number"
          value={ac}
          onChange={(e) => setAc(e.target.value)}
          placeholder="10"
          min={0}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPlayer}
            onChange={(e) => setIsPlayer(e.target.checked)}
            className="rounded accent-primary"
          />
          <span className="text-sm text-text-secondary">Player Character</span>
        </label>

        <Button type="submit" size="sm" disabled={addCombatant.isPending || !name.trim()}>
          Add
        </Button>
      </div>
    </form>
  )
}
