import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiThreeFriends, GiHoodedFigure, GiSpikedDragonHead } from '@/components/ui/icons'
import { rollD20, abilityModifier } from '@/lib/dnd'
import { usePCs, useNPCs } from '@/features/characters/useCharacters'
import { useCampaignMonsters } from '@/features/bestiary/useMonsters'
import { useAddCombatant } from './useCombatants'
import type { PlayerCharacter, NPC, Monster, AbilityScores } from '@/lib/types'

interface Props {
  campaignId: string
  sessionId?: string
}

type Tab = 'pcs' | 'npcs' | 'monsters'

export function QuickAddPanel({ campaignId, sessionId }: Props) {
  const [tab, setTab] = useState<Tab>('pcs')
  const [filter, setFilter] = useState('')
  const { data: pcs } = usePCs(campaignId)
  const { data: npcs } = useNPCs(campaignId)
  const { data: monsters } = useCampaignMonsters(campaignId)
  const addCombatant = useAddCombatant()

  const addPC = (pc: PlayerCharacter) => {
    const init = rollD20() + pc.initiative_bonus
    addCombatant.mutate({
      campaign_id: campaignId,
      session_id: sessionId,
      name: pc.name,
      initiative: init,
      hp_current: pc.hp_current,
      hp_max: pc.hp_max,
      armor_class: pc.armor_class,
      is_player: true,
    })
  }

  const addNPC = (npc: NPC) => {
    const dexMod = npc.stats?.dexterity ? abilityModifier(npc.stats.dexterity) : 0
    const init = rollD20() + dexMod
    addCombatant.mutate({
      campaign_id: campaignId,
      session_id: sessionId,
      name: npc.name,
      initiative: init,
      hp_current: npc.stats?.hp ?? 10,
      hp_max: npc.stats?.hp ?? 10,
      armor_class: npc.stats?.ac ?? 10,
      is_player: false,
    })
  }

  const addMonster = (monster: Monster) => {
    const sb = monster.stat_block as { dexterity?: number } | null
    const dexMod = sb?.dexterity ? abilityModifier(sb.dexterity) : 0
    const init = rollD20() + dexMod
    addCombatant.mutate({
      campaign_id: campaignId,
      session_id: sessionId,
      name: monster.name,
      initiative: init,
      hp_current: monster.hit_points,
      hp_max: monster.hit_points,
      armor_class: monster.armor_class,
      is_player: false,
    })
  }

  const filteredPCs = pcs?.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
  const filteredNPCs = npcs?.filter((n) => n.name.toLowerCase().includes(filter.toLowerCase()))
  const filteredMonsters = monsters?.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {([
          { key: 'pcs' as Tab, label: 'PCs', icon: GiThreeFriends },
          { key: 'npcs' as Tab, label: 'NPCs', icon: GiHoodedFigure },
          { key: 'monsters' as Tab, label: 'Monsters', icon: GiSpikedDragonHead },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setFilter('') }}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-[--radius-sm] cursor-pointer transition-colors ${
              tab === t.key ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'
            }`}
          >
            <GameIcon icon={t.icon} size="xs" /> {t.label}
          </button>
        ))}
      </div>

      <Input placeholder="Filter..." value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2" />

      <div className="max-h-48 overflow-y-auto space-y-1">
        {tab === 'pcs' && filteredPCs?.map((pc) => (
          <QuickAddRow
            key={pc.id}
            name={pc.name}
            subtitle={`${pc.class ?? ''} Lvl ${pc.level} · HP ${pc.hp_max} · AC ${pc.armor_class}`}
            onAdd={() => addPC(pc)}
            disabled={addCombatant.isPending}
          />
        ))}
        {tab === 'npcs' && filteredNPCs?.map((npc) => (
          <QuickAddRow
            key={npc.id}
            name={npc.name}
            subtitle={`${npc.occupation ?? 'NPC'}${npc.stats?.hp ? ` · HP ${npc.stats.hp}` : ''}${npc.stats?.ac ? ` · AC ${npc.stats.ac}` : ''}`}
            onAdd={() => addNPC(npc)}
            disabled={addCombatant.isPending}
          />
        ))}
        {tab === 'monsters' && filteredMonsters?.map((m) => (
          <QuickAddRow
            key={m.id}
            name={m.name}
            subtitle={`CR ${m.challenge_rating} · HP ${m.hit_points} · AC ${m.armor_class}`}
            onAdd={() => addMonster(m)}
            disabled={addCombatant.isPending}
          />
        ))}
        {((tab === 'pcs' && !filteredPCs?.length) ||
          (tab === 'npcs' && !filteredNPCs?.length) ||
          (tab === 'monsters' && !filteredMonsters?.length)) && (
          <p className="text-xs text-text-muted py-2 text-center">None found.</p>
        )}
      </div>
    </div>
  )
}

function QuickAddRow({ name, subtitle, onAdd, disabled }: {
  name: string; subtitle: string; onAdd: () => void; disabled: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-[--radius-sm] hover:bg-bg-raised transition-colors group">
      <span className="text-sm text-text-body flex-1 truncate">{name}</span>
      <span className="text-xs text-text-muted truncate max-w-32">{subtitle}</span>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="text-xs text-primary-light hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  )
}
