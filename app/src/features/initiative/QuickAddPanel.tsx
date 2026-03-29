import { useState, useRef, useEffect } from 'react'
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
  const [pendingPcId, setPendingPcId] = useState<string | null>(null)
  const { data: pcs } = usePCs(campaignId)
  const { data: npcs } = useNPCs(campaignId)
  const { data: monsters } = useCampaignMonsters(campaignId)
  const addCombatant = useAddCombatant()

  const addPC = (pc: PlayerCharacter, initiative: number) => {
    addCombatant.mutate({
      campaign_id: campaignId,
      session_id: sessionId,
      name: pc.name,
      initiative,
      hp_current: pc.hp_current,
      hp_max: pc.hp_max,
      armor_class: pc.armor_class,
      is_player: true,
      source_type: 'pc',
      source_snapshot: {
        name: pc.name, race: pc.race, class: pc.class, subclass: pc.subclass,
        level: pc.level, ability_scores: pc.ability_scores as AbilityScores,
        hp_current: pc.hp_current, hp_max: pc.hp_max, armor_class: pc.armor_class,
        speed: pc.speed, proficiency_bonus: pc.proficiency_bonus,
        saving_throw_proficiencies: pc.saving_throw_proficiencies,
        skill_proficiencies: pc.skill_proficiencies,
        equipment: pc.equipment, class_features: pc.class_features,
        traits: pc.traits, personality_traits: pc.personality_traits,
        ideals: pc.ideals, bonds: pc.bonds, flaws: pc.flaws,
        backstory: pc.backstory, appearance: pc.appearance,
        notes: pc.notes, player_name: pc.player_name,
        portrait_url: pc.portrait_url, spellcasting_ability: pc.spellcasting_ability,
        is_pc: true,
      },
    })
    setPendingPcId(null)
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
      source_type: 'npc',
      source_snapshot: {
        name: npc.name, race: npc.race, occupation: npc.occupation,
        personality: npc.personality, appearance: npc.appearance,
        notes: npc.notes, stats: npc.stats,
        portrait_url: npc.portrait_url, stat_block: npc.stat_block,
      },
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
      source_type: 'monster',
      source_snapshot: {
        name: monster.name, size: monster.size, type: monster.type,
        alignment: monster.alignment, challenge_rating: monster.challenge_rating,
        armor_class: monster.armor_class, hit_points: monster.hit_points,
        hit_dice: monster.hit_dice, speed: monster.speed,
        stat_block: monster.stat_block,
        armor_desc: monster.armor_desc, notes: monster.notes,
      },
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
          pendingPcId === pc.id ? (
            <PcInitiativeInput
              key={pc.id}
              pcName={pc.name}
              onConfirm={(init) => addPC(pc, init)}
              onCancel={() => setPendingPcId(null)}
              disabled={addCombatant.isPending}
            />
          ) : (
            <QuickAddRow
              key={pc.id}
              name={pc.name}
              subtitle={`${pc.class ?? ''} Lvl ${pc.level} · HP ${pc.hp_max} · AC ${pc.armor_class}`}
              onAdd={() => setPendingPcId(pc.id)}
              disabled={addCombatant.isPending}
            />
          )
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

function PcInitiativeInput({ pcName, onConfirm, onCancel, disabled }: {
  pcName: string
  onConfirm: (initiative: number) => void
  onCancel: () => void
  disabled: boolean
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const num = parseInt(value, 10)
    if (!isNaN(num)) onConfirm(num)
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-[--radius-sm] bg-bg-raised">
      <span className="text-sm text-text-body flex-1 truncate">{pcName}</span>
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Init"
        className="w-14 text-center text-sm font-mono bg-bg-base border border-border rounded-[--radius-sm] px-1 py-1 text-text-heading outline-none focus:border-primary"
        disabled={disabled}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value}
        className="text-xs text-primary-light hover:underline cursor-pointer disabled:opacity-50"
      >
        Add
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-text-muted hover:text-text-body cursor-pointer"
      >
        ✕
      </button>
    </div>
  )
}
