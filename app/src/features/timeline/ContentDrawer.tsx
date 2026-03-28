import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiThreeFriends, GiSpikedDragonHead, GiSparkles, GiPositionMarker,
  GiCrossedSwords, GiHoodedFigure, GiNotebook,
  GiQuillInk, GiLinkedRings, GiWoodFrame, GiTreasureMap,
} from '@/components/ui/icons'
import { usePCs, useNPCs } from '@/features/characters/useCharacters'
import { useCampaignMonsters } from '@/features/bestiary/useMonsters'
import { useCampaignSpells } from '@/features/spellbook/useSpells'
import { useLocations } from '@/features/locations/useLocations'
import { useCampaignInspiration } from '@/features/scratchpad/useInspiration'
import { useHandouts } from '@/features/handouts/useHandouts'
import type { Handout } from '@/lib/types'
import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { PlayerCharacter, NPC, Monster, Spell, AbilityScores } from '@/lib/types'
import type { Open5eMonster, Open5eSpell } from '@/lib/open5e'
import type { Location } from '@/features/locations/useLocations'

interface Props {
  campaignId: string
  sessionId: string
  onAddToTimeline: (block: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
  onClose: () => void
}

type Tab = 'characters' | 'monsters' | 'spells' | 'locations' | 'inspiration' | 'handouts'

export function ContentDrawer({ campaignId, onAddToTimeline, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('characters')
  const [filter, setFilter] = useState('')

  return (
    <div className="bg-bg-base rounded-[--radius-lg] border border-border overflow-hidden" data-tutorial="content-drawer">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm text-text-heading font-medium">Add to Timeline</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
      </div>

      <div className="flex gap-1 p-2 border-b border-border">
        {([
          { key: 'characters' as Tab, label: 'Characters', icon: GiThreeFriends },
          { key: 'monsters' as Tab, label: 'Monsters', icon: GiSpikedDragonHead },
          { key: 'spells' as Tab, label: 'Spells', icon: GiSparkles },
          { key: 'locations' as Tab, label: 'Locations', icon: GiPositionMarker },
          { key: 'inspiration' as Tab, label: 'Inspiration', icon: GiNotebook },
          { key: 'handouts' as Tab, label: 'Handouts', icon: GiQuillInk },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setFilter('') }}
            className={`flex items-center gap-1 px-2.5 py-1 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${
              tab === t.key ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'
            }`}
          >
            <GameIcon icon={t.icon} size="xs" /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        <Input
          placeholder={`Search...`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-2"
        />

        <div className="max-h-72 overflow-y-auto space-y-1">
          {tab === 'characters' && <CharacterItems campaignId={campaignId} filter={filter} onAdd={onAddToTimeline} />}
          {tab === 'monsters' && <MonsterItems campaignId={campaignId} filter={filter} onAdd={onAddToTimeline} />}
          {tab === 'spells' && <SpellItems campaignId={campaignId} filter={filter} onAdd={onAddToTimeline} />}
          {tab === 'locations' && <LocationItems campaignId={campaignId} filter={filter} onAdd={onAddToTimeline} />}
          {tab === 'inspiration' && <InspirationItems campaignId={campaignId} onAdd={onAddToTimeline} />}
          {tab === 'handouts' && <HandoutItems campaignId={campaignId} filter={filter} onAdd={onAddToTimeline} />}
        </div>

        {/* Quick add battle block */}
        <div className="mt-3 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => onAddToTimeline({
              block_type: 'battle',
              source_id: '',
              title: 'Battle',
              content_snapshot: {},
            })}
          >
            <GameIcon icon={GiCrossedSwords} size="sm" /> Add Battle Block
          </Button>
        </div>
      </div>
    </div>
  )
}

function CharacterItems({ campaignId, filter, onAdd }: {
  campaignId: string; filter: string
  onAdd: (b: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: pcs } = usePCs(campaignId)
  const { data: npcs } = useNPCs(campaignId)
  const filteredPCs = pcs?.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
  const filteredNPCs = npcs?.filter((n) => n.name.toLowerCase().includes(filter.toLowerCase()))

  const addPC = (pc: PlayerCharacter) => {
    const scores = pc.ability_scores as AbilityScores
    onAdd({
      block_type: 'npc',
      source_id: pc.id,
      title: `${pc.name} — ${[pc.race, pc.class].filter(Boolean).join(' ')} Lvl ${pc.level}`,
      content_snapshot: {
        name: pc.name, race: pc.race, class: pc.class, level: pc.level,
        hp_current: pc.hp_current, hp_max: pc.hp_max, armor_class: pc.armor_class,
        speed: pc.speed, initiative_bonus: pc.initiative_bonus,
        ability_scores: scores,
        personality_traits: pc.personality_traits, notes: pc.notes,
        player_name: pc.player_name, is_pc: true,
      },
    })
  }

  const addNPC = (npc: NPC) => {
    onAdd({
      block_type: 'npc',
      source_id: npc.id,
      title: `${npc.name}${npc.occupation ? ` — ${npc.occupation}` : ''}`,
      content_snapshot: {
        name: npc.name, race: npc.race, occupation: npc.occupation,
        personality: npc.personality, appearance: npc.appearance,
        notes: npc.notes, stats: npc.stats,
      },
    })
  }

  return (
    <>
      {filteredPCs?.map((pc) => (
        <ItemRow key={pc.id} icon={GiHoodedFigure} name={pc.name} subtitle={`${pc.class ?? ''} ${pc.level}`} badge="PC" badgeClass="text-info bg-info/10" onAdd={() => addPC(pc)} />
      ))}
      {filteredNPCs?.map((npc) => (
        <ItemRow key={npc.id} icon={GiHoodedFigure} name={npc.name} subtitle={npc.occupation ?? ''} badge="NPC" badgeClass="text-accent bg-accent/10" onAdd={() => addNPC(npc)} />
      ))}
      {!filteredPCs?.length && !filteredNPCs?.length && <Empty />}
    </>
  )
}

function MonsterItems({ campaignId, filter, onAdd }: {
  campaignId: string; filter: string
  onAdd: (b: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: monsters } = useCampaignMonsters(campaignId)
  const filtered = monsters?.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {filtered?.map((m) => (
        <ItemRow
          key={m.id}
          icon={GiSpikedDragonHead}
          name={m.name}
          subtitle={`CR ${m.challenge_rating} · HP ${m.hit_points}`}
          onAdd={() => onAdd({
            block_type: 'monster',
            source_id: m.id,
            title: `${m.name} — CR ${m.challenge_rating}`,
            content_snapshot: {
              name: m.name, size: m.size, type: m.type, alignment: m.alignment,
              challenge_rating: m.challenge_rating, armor_class: m.armor_class,
              hit_points: m.hit_points, hit_dice: m.hit_dice, speed: m.speed,
              stat_block: m.stat_block,
            },
          })}
        />
      ))}
      {!filtered?.length && <Empty />}
    </>
  )
}

function SpellItems({ campaignId, filter, onAdd }: {
  campaignId: string; filter: string
  onAdd: (b: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: spells } = useCampaignSpells(campaignId)
  const filtered = spells?.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {filtered?.map((s) => (
        <ItemRow
          key={s.id}
          icon={GiSparkles}
          name={s.name}
          subtitle={`${s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`} · ${s.school}`}
          onAdd={() => onAdd({
            block_type: 'spell',
            source_id: s.id,
            title: `${s.name} — ${s.level === 0 ? 'Cantrip' : `Level ${s.level}`}`,
            content_snapshot: {
              name: s.name, level: s.level, school: s.school,
              casting_time: s.casting_time, range: s.range, duration: s.duration,
              concentration: s.concentration, ritual: s.ritual, components: s.components,
              spell_data: s.spell_data,
            },
          })}
        />
      ))}
      {!filtered?.length && <Empty />}
    </>
  )
}

function LocationItems({ campaignId, filter, onAdd }: {
  campaignId: string; filter: string
  onAdd: (b: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: locations } = useLocations(campaignId)
  const filtered = locations?.filter((l: Location) => l.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {filtered?.map((l: Location) => (
        <ItemRow
          key={l.id}
          icon={GiPositionMarker}
          name={l.name}
          subtitle={l.type ?? ''}
          onAdd={() => onAdd({
            block_type: 'location',
            source_id: l.id,
            title: l.name,
            content_snapshot: {
              name: l.name, type: l.type, description: l.description, notes: l.notes,
            },
          })}
        />
      ))}
      {!filtered?.length && <Empty />}
    </>
  )
}

function InspirationItems({ campaignId, onAdd }: {
  campaignId: string
  onAdd: (block: { block_type: string; source_id?: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: items } = useCampaignInspiration(campaignId)

  if (!items?.length) return <p className="text-stone-500 text-sm p-4">No inspiration items for this campaign.</p>

  const typeIcon = (type: string) => {
    switch (type) {
      case 'image': return GiWoodFrame
      case 'link':  return GiLinkedRings
      case 'map':   return GiTreasureMap
      default:      return GiQuillInk
    }
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <ItemRow
          key={item.id}
          icon={typeIcon(item.type)}
          name={item.title}
          subtitle={item.type}
          onAdd={() => onAdd({
            block_type: 'note',
            source_id: item.id,
            title: item.title,
            content_snapshot: {
              title: item.title,
              content: item.content,
              type: item.type,
              tags: item.tags,
              media_url: item.media_url,
            },
          })}
        />
      ))}
    </div>
  )
}

function HandoutItems({ campaignId, filter, onAdd }: {
  campaignId: string; filter: string
  onAdd: (b: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: handouts } = useHandouts(campaignId)
  const filtered = handouts?.filter((h: Handout) => h.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {filtered?.map((h: Handout) => (
        <ItemRow
          key={h.id}
          icon={GiQuillInk}
          name={h.name}
          subtitle={h.template}
          onAdd={() => onAdd({
            block_type: 'handout',
            source_id: h.id,
            title: h.name,
            content_snapshot: {
              template: h.template,
              content: h.content,
              style: h.style,
              seal: h.seal,
            },
          })}
        />
      ))}
      {!filtered?.length && <Empty />}
    </>
  )
}

function ItemRow({ icon, name, subtitle, badge, badgeClass, onAdd }: {
  icon: IconComponent; name: string; subtitle: string; badge?: string; badgeClass?: string
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-[--radius-sm] hover:bg-bg-raised transition-colors group">
      <GameIcon icon={icon} size="xs" />
      {badge && <span className={`text-[10px] px-1 py-0.5 rounded-[--radius-sm] ${badgeClass}`}>{badge}</span>}
      <span className="text-sm text-text-body flex-1 truncate">{name}</span>
      <span className="text-xs text-text-muted truncate max-w-24">{subtitle}</span>
      <button
        onClick={onAdd}
        className="text-xs text-primary-light opacity-0 group-hover:opacity-100 hover:underline cursor-pointer transition-opacity"
      >
        + Add
      </button>
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-text-muted py-2 text-center">Nothing found.</p>
}
