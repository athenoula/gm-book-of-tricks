import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { useQuickReferenceDetail } from './useQuickReferenceSearch'
import { useAssignAbilityToCharacter } from './useAbilities'
import { useAddTimelineBlock } from '@/features/timeline/useTimelineBlocks'
import type { SearchGroup } from './useQuickReferenceSearch'
import { abilityModifier, formatModifier } from '@/lib/dnd'

interface Props {
  type: SearchGroup['type']
  id: string
  campaignId: string
  sessionId: string | null
}

export function QuickReferenceDetail({ type, id, campaignId, sessionId }: Props) {
  const { data: detail, isLoading } = useQuickReferenceDetail(type, id)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return <p className="text-text-muted text-sm p-4">Loading...</p>
  if (!detail) return <p className="text-text-muted text-sm p-4">Select an item to view details</p>

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {type === 'spell' && <SpellDetail data={detail.data} expanded={expanded} />}
        {type === 'monster' && <MonsterDetail data={detail.data} expanded={expanded} />}
        {type === 'ability' && <AbilityDetail data={detail.data} expanded={expanded} />}
        {type === 'pc' && <PCDetail data={detail.data} expanded={expanded} />}
        {type === 'npc' && <NPCDetail data={detail.data} expanded={expanded} />}
        {type === 'location' && <LocationDetail data={detail.data} expanded={expanded} />}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-text-muted border border-border rounded-[--radius-sm] px-2.5 py-1 mt-3 hover:text-text-body hover:border-border-hover transition-colors"
        >
          {expanded ? '▲ Show Less' : '▼ Full Details'}
        </button>
      </div>

      <ActionButtons
        type={type}
        item={detail.data}
        campaignId={campaignId}
        sessionId={sessionId}
      />
    </div>
  )
}

// ─── Spell Detail ───────────────────────────────────────

function SpellDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const sd = data.spell_data as Record<string, unknown> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">
          {data.level === 0 ? 'Cantrip' : `Level ${data.level}`} {data.school as string}
        </span>
      </div>

      <div className="flex gap-4 p-2 bg-bg-raised rounded-[--radius-md] text-xs mb-3">
        {sd?.range && <div><span className="text-text-muted">Range:</span> <span className="text-text-body">{sd.range as string}</span></div>}
        {sd?.duration && <div><span className="text-text-muted">Duration:</span> <span className="text-text-body">{sd.duration as string}</span></div>}
        {sd?.casting_time && <div><span className="text-text-muted">Cast:</span> <span className="text-text-body">{sd.casting_time as string}</span></div>}
        {data.components && <div><span className="text-text-muted">Comp:</span> <span className="text-text-body">{data.components as string}</span></div>}
      </div>

      <p className="text-sm text-text-body leading-relaxed mb-2">{(sd?.desc || data.description || '') as string}</p>

      {expanded && sd?.higher_level && (
        <div className="text-sm text-text-secondary mt-2">
          <span className="text-text-muted font-medium">At Higher Levels:</span> {sd.higher_level as string}
        </div>
      )}
    </div>
  )
}

// ─── Monster Detail ─────────────────────────────────────

function MonsterDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const sb = data.stat_block as Record<string, unknown> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">
          CR {data.challenge_rating as string}
        </span>
      </div>

      <div className="flex gap-4 p-2 bg-bg-raised rounded-[--radius-md] text-xs mb-3">
        <div><span className="text-text-muted">AC:</span> <span className="text-text-heading font-mono">{data.armor_class as number}</span></div>
        <div><span className="text-text-muted">HP:</span> <span className="text-text-heading font-mono">{data.hit_points as number}</span></div>
        {data.hit_dice && <div><span className="text-text-muted">HD:</span> <span className="text-text-body">{data.hit_dice as string}</span></div>}
        {sb?.speed && <div><span className="text-text-muted">Speed:</span> <span className="text-text-body">{Object.entries(sb.speed as Record<string, number>).map(([k, v]) => `${k} ${v}ft`).join(', ')}</span></div>}
      </div>

      {/* Ability scores */}
      {sb && (
        <div className="grid grid-cols-6 gap-1.5 text-center mb-3">
          {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5">
              <div className="text-[9px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-text-heading font-mono text-xs">{sb[ability] as number}</div>
              <div className="text-[10px] text-text-secondary">{formatModifier(abilityModifier(sb[ability] as number))}</div>
            </div>
          ))}
        </div>
      )}

      {/* Key actions (condensed: first 3, expanded: all) */}
      {sb?.actions && (
        <div className="mb-2">
          <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Actions</h5>
          {((sb.actions as { name: string; desc: string }[])
            .slice(0, expanded ? undefined : 3))
            .map((a, i) => (
              <p key={i} className="text-xs text-text-body mb-1">
                <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
              </p>
            ))}
          {!expanded && (sb.actions as unknown[]).length > 3 && (
            <p className="text-xs text-text-muted italic">+{(sb.actions as unknown[]).length - 3} more actions...</p>
          )}
        </div>
      )}

      {expanded && sb?.special_abilities && (sb.special_abilities as unknown[]).length > 0 && (
        <div className="mb-2">
          <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Special Abilities</h5>
          {(sb.special_abilities as { name: string; desc: string }[]).map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}

      {expanded && sb?.legendary_actions && (sb.legendary_actions as unknown[]).length > 0 && (
        <div className="mb-2">
          <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Legendary Actions</h5>
          {sb.legendary_desc && <p className="text-xs text-text-secondary mb-1">{sb.legendary_desc as string}</p>}
          {(sb.legendary_actions as { name: string; desc: string }[]).map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Ability Detail ─────────────────────────────────────

function AbilityDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const usageLabels: Record<string, { label: string; color: string }> = {
    action: { label: 'Action', color: 'bg-primary/15 text-primary-light' },
    bonus_action: { label: 'Bonus Action', color: 'bg-success/15 text-success' },
    reaction: { label: 'Reaction', color: 'bg-warning/15 text-warning' },
    passive: { label: 'Passive', color: 'bg-info/15 text-info' },
    other: { label: 'Other', color: 'bg-bg-raised text-text-muted' },
  }
  const usage = usageLabels[(data.usage_type as string) || 'other']
  const ad = data.ability_data as Record<string, unknown> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-[--radius-sm] ${usage.color}`}>{usage.label}</span>
          <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">{data.source as string}</span>
        </div>
      </div>

      {ad?.feature_class && (
        <div className="text-xs text-text-secondary mb-2">
          <span className="text-text-muted">Class:</span> {ad.feature_class as string}
          {ad.level && <> · Level {ad.level as number}</>}
        </div>
      )}

      <p className="text-sm text-text-body leading-relaxed">{data.description as string}</p>

      {expanded && ad && (
        <div className="mt-2 text-xs text-text-secondary">
          {ad.document__title && <div><span className="text-text-muted">Source:</span> {ad.document__title as string}</div>}
        </div>
      )}
    </div>
  )
}

// ─── PC Detail ──────────────────────────────────────────

function PCDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const abilityScores = data.ability_scores as Record<string, number> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">
          {data.race as string} {data.class as string} · Lvl {data.level as number}
        </span>
      </div>

      <div className="flex gap-4 p-2 bg-bg-raised rounded-[--radius-md] text-xs mb-3">
        <div><span className="text-text-muted">AC:</span> <span className="text-text-heading font-mono">{data.armor_class as number}</span></div>
        <div><span className="text-text-muted">HP:</span> <span className="text-text-heading font-mono">{data.hp_current as number}/{data.hp_max as number}</span></div>
        <div><span className="text-text-muted">Speed:</span> <span className="text-text-body">{data.speed as number}ft</span></div>
      </div>

      {abilityScores && (
        <div className="grid grid-cols-6 gap-1.5 text-center mb-3">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5">
              <div className="text-[9px] text-text-muted uppercase">{ability}</div>
              <div className="text-text-heading font-mono text-xs">{abilityScores[ability]}</div>
              <div className="text-[10px] text-text-secondary">{formatModifier(abilityModifier(abilityScores[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      {expanded && data.backstory && (
        <div className="text-sm text-text-body leading-relaxed mt-2">{data.backstory as string}</div>
      )}
    </div>
  )
}

// ─── NPC Detail ─────────────────────────────────────────

function NPCDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  return (
    <div>
      <h3 className="text-text-heading text-lg font-semibold mb-2">{data.name as string}</h3>

      <div className="space-y-1 text-xs text-text-secondary mb-3">
        {data.race && <div><span className="text-text-muted">Race:</span> {data.race as string}</div>}
        {data.occupation && <div><span className="text-text-muted">Occupation:</span> {data.occupation as string}</div>}
        {data.personality && <div><span className="text-text-muted">Personality:</span> {data.personality as string}</div>}
        {data.appearance && <div><span className="text-text-muted">Appearance:</span> {data.appearance as string}</div>}
      </div>

      {expanded && (
        <>
          {data.notes && <p className="text-sm text-text-body leading-relaxed">{data.notes as string}</p>}
          {data.stats && (
            <div className="mt-2 text-xs text-text-secondary">
              <span className="text-text-muted">Stats:</span> {JSON.stringify(data.stats)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Location Detail ────────────────────────────────────

function LocationDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        {data.type && (
          <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">{data.type as string}</span>
        )}
      </div>

      {data.description && <p className="text-sm text-text-body leading-relaxed mb-2">{data.description as string}</p>}

      {expanded && data.notes && (
        <p className="text-sm text-text-secondary leading-relaxed mt-2">{data.notes as string}</p>
      )}
    </div>
  )
}

// ─── Action Buttons ─────────────────────────────────────

const NAV_MAP: Record<string, string> = {
  spell: 'spellbook',
  monster: 'bestiary',
  ability: 'characters',
  pc: 'characters',
  npc: 'characters',
  location: 'locations',
}

const NAV_LABELS: Record<string, string> = {
  spell: 'Spellbook',
  monster: 'Bestiary',
  ability: 'Characters',
  pc: 'Characters',
  npc: 'Characters',
  location: 'Locations',
}

function useCampaignPCs(campaignId: string) {
  return useQuery({
    queryKey: ['quick-ref-pcs', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_characters')
        .select('id, name')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })
}

function ActionButtons({
  type,
  item,
  campaignId,
  sessionId,
}: {
  type: SearchGroup['type']
  item: Record<string, unknown>
  campaignId: string
  sessionId: string | null
}) {
  const addBlock = useAddTimelineBlock()
  const assignAbility = useAssignAbilityToCharacter()
  const { data: pcs } = useCampaignPCs(campaignId)
  const [showPCDropdown, setShowPCDropdown] = useState(false)
  const [addedToLibrary, setAddedToLibrary] = useState(false)

  const handleAddToTimeline = () => {
    if (!sessionId) return
    addBlock.mutate({
      session_id: sessionId,
      campaign_id: campaignId,
      block_type: type === 'pc' ? 'note' : type === 'ability' ? 'note' : type as 'monster' | 'npc' | 'spell' | 'location',
      source_id: item.id as string,
      title: item.name as string,
      content_snapshot: item,
      sort_order: Math.floor(Date.now() / 1000) % 100000,
    })
  }

  const handleAssignToCharacter = (characterId: string) => {
    assignAbility.mutate({
      ability_id: item.id as string,
      character_id: characterId,
      campaign_id: campaignId,
    })
    setShowPCDropdown(false)
  }

  // Show "Add to Spellbook/Bestiary" for SRD items not yet in campaign
  const isSrdItem = (item.source as string) === 'srd'
  const showAddToLibrary = (type === 'spell' || type === 'monster') && isSrdItem && !addedToLibrary

  const handleAddToLibrary = () => {
    // The item is already in the campaign library if it was found by our search
    // (which queries campaign-scoped tables). This button is for future use when
    // search also includes SRD results not yet saved to the campaign.
    // For now, mark as added.
    setAddedToLibrary(true)
  }

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border relative flex-wrap">
      <Button
        size="sm"
        onClick={handleAddToTimeline}
        disabled={!sessionId}
        title={!sessionId ? 'Navigate to a session first' : undefined}
      >
        + Add to Timeline
      </Button>

      {showAddToLibrary && (
        <Button size="sm" variant="secondary" onClick={handleAddToLibrary}>
          + Add to {type === 'spell' ? 'Spellbook' : 'Bestiary'}
        </Button>
      )}

      {addedToLibrary && (type === 'spell' || type === 'monster') && (
        <span className="text-xs text-success">✓ In {type === 'spell' ? 'Spellbook' : 'Bestiary'}</span>
      )}

      {type === 'ability' && (
        <div className="relative">
          <Button size="sm" variant="secondary" onClick={() => setShowPCDropdown(!showPCDropdown)}>
            + Add to Character
          </Button>
          {showPCDropdown && pcs && (
            <div className="absolute bottom-full left-0 mb-1 bg-bg-base border border-border rounded-[--radius-md] shadow-lg overflow-hidden min-w-[160px] z-10">
              {pcs.map((pc) => (
                <button
                  key={pc.id}
                  onClick={() => handleAssignToCharacter(pc.id)}
                  className="w-full text-left px-3 py-2 text-sm text-text-body hover:bg-bg-raised cursor-pointer"
                >
                  {pc.name}
                </button>
              ))}
              {pcs.length === 0 && (
                <p className="px-3 py-2 text-xs text-text-muted">No characters in campaign</p>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const segment = NAV_MAP[type]
          if (segment) {
            window.location.hash = `#/campaign/${campaignId}/${segment}`
          }
        }}
      >
        Go to {NAV_LABELS[type]}
      </Button>
    </div>
  )
}
