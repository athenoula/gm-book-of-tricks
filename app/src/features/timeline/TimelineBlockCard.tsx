import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiScrollUnfurled, GiQuillInk, GiSpikedDragonHead, GiHoodedFigure,
  GiSparkles, GiPositionMarker, GiCrossedSwords,
} from '@/components/ui/icons'
import { MarkdownPreview } from './MarkdownPreview'
import { SceneEditor } from './SceneEditor'
import { useUpdateTimelineBlock, useRemoveTimelineBlock, useUpdateTimelineBlockSnapshot } from './useTimelineBlocks'
import type { TimelineBlock } from './useTimelineBlocks'
import { InlineBattle } from './InlineBattle'
import { InitiativeTracker } from '@/features/initiative/InitiativeTracker'
import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { Open5eMonster, Open5eSpell } from '@/lib/open5e'

const BLOCK_STYLES: Record<string, { icon: IconComponent; borderColor: string; label: string }> = {
  scene: { icon: GiScrollUnfurled, borderColor: 'border-l-primary', label: 'Scene' },
  note: { icon: GiQuillInk, borderColor: 'border-l-text-muted', label: 'Note' },
  monster: { icon: GiSpikedDragonHead, borderColor: 'border-l-danger', label: 'Monster' },
  npc: { icon: GiHoodedFigure, borderColor: 'border-l-accent', label: 'NPC' },
  spell: { icon: GiSparkles, borderColor: 'border-l-info', label: 'Spell' },
  location: { icon: GiPositionMarker, borderColor: 'border-l-success', label: 'Location' },
  battle: { icon: GiCrossedSwords, borderColor: 'border-l-warning', label: 'Battle' },
}

interface Props {
  block: TimelineBlock
  dragHandleProps?: Record<string, unknown>
  onPin?: () => void
  isPinned?: boolean
}

export function TimelineBlockCard({ block, dragHandleProps, onPin, isPinned }: Props) {
  const updateBlock = useUpdateTimelineBlock()
  const removeBlock = useRemoveTimelineBlock()
  const updateSnapshot = useUpdateTimelineBlockSnapshot()
  const [editingBattle, setEditingBattle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const style = BLOCK_STYLES[block.block_type] ?? BLOCK_STYLES.note
  const snapshot = block.content_snapshot

  const toggleCollapse = () => {
    updateBlock.mutate({ id: block.id, is_collapsed: !block.is_collapsed })
  }

  const handleRemove = () => {
    removeBlock.mutate({ id: block.id, sessionId: block.session_id })
  }

  const handleStartEditNote = () => {
    setEditTitle(block.title)
    setEditContent((snapshot.content as string) || '')
    setEditingNote(true)
  }

  const handleSaveNote = () => {
    // Update the title
    updateBlock.mutate({ id: block.id, title: editTitle })
    // Update the snapshot content
    updateSnapshot.mutate({
      blockId: block.id,
      snapshot: { ...snapshot, content: editContent },
    })
    setEditingNote(false)
  }

  const handleCancelEditNote = () => {
    setEditingNote(false)
  }

  return (
    <div className={`bg-bg-base rounded-[--radius-lg] border border-border border-l-3 ${style.borderColor} ornamental-corners`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span {...dragHandleProps} className="text-text-muted cursor-grab active:cursor-grabbing select-none">
          ⠿
        </span>

        {editingNote ? (
          <>
            <GameIcon icon={style.icon} size="sm" />
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 bg-transparent text-text-heading font-medium outline-none border-b border-border-hover focus:border-primary text-sm"
            />
            <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
              {style.label}
            </span>
          </>
        ) : (
          <button
            onClick={toggleCollapse}
            className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0"
          >
            <GameIcon icon={style.icon} size="sm" />
            <span className="text-sm font-medium text-text-heading truncate flex-1">
              {block.title}
            </span>
            <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
              {style.label}
            </span>
            <span className="text-xs text-text-muted">{block.is_collapsed ? '▸' : '▾'}</span>
          </button>
        )}

        {block.block_type === 'battle' && (
          <Button size="sm" variant="secondary" onClick={() => setEditingBattle(!editingBattle)}>
            {editingBattle ? 'Close' : 'Edit Battle'}
          </Button>
        )}
        {block.block_type === 'note' && !editingNote && (
          <Button size="sm" variant="ghost" onClick={handleStartEditNote}>
            Edit
          </Button>
        )}
        {block.block_type === 'note' && editingNote && (
          <>
            <Button size="sm" variant="ghost" onClick={handleCancelEditNote}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote}>
              Save
            </Button>
          </>
        )}
        {onPin && !editingNote && (
          <Button size="sm" variant="ghost" onClick={onPin} title={isPinned ? 'Unpin' : 'Pin to top'}>
            {isPinned ? '📌' : '📍'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleRemove} className="text-danger hover:text-danger">
          ✕
        </Button>
      </div>

      {/* Content (collapsible, but always shown when editing) */}
      {(!block.is_collapsed || editingNote) && (
        <div className="px-4 py-3">
          {block.block_type === 'monster' && <MonsterSnapshot data={snapshot} />}
          {block.block_type === 'npc' && <NPCSnapshot data={snapshot} />}
          {block.block_type === 'spell' && <SpellSnapshot data={snapshot} />}
          {block.block_type === 'location' && <LocationSnapshot data={snapshot} />}
          {block.block_type === 'note' && (
            <SceneEditor
              content={editingNote ? editContent : (snapshot.content as string) || ''}
              editable={editingNote}
              onChange={(json) => setEditContent(json)}
            />
          )}
          {block.block_type === 'battle' && !editingBattle && <InlineBattle block={block} />}
        </div>
      )}

      {/* Inline Initiative Tracker for editing battles */}
      {editingBattle && block.block_type === 'battle' && (
        <div className="px-4 py-3 border-t border-border">
          <InitiativeTracker
            campaignId={block.campaign_id}
            sessionId={block.session_id}
            inline
            battleId={block.source_id || undefined}
            onSnapshotUpdate={(snapshot) => {
              updateSnapshot.mutate({ blockId: block.id, snapshot })
            }}
          />
        </div>
      )}
    </div>
  )
}

function MonsterSnapshot({ data }: { data: Record<string, unknown> }) {
  const sb = (data.stat_block ?? data) as Open5eMonster

  return (
    <div className="space-y-2 text-sm">
      <div className="flex gap-3 text-xs text-text-secondary flex-wrap">
        <span>{data.size as string} {data.type as string}</span>
        <span>CR {data.challenge_rating as string}</span>
        <span>AC {data.armor_class as number}</span>
        <span>HP {data.hit_points as number}</span>
      </div>

      {sb.strength && (
        <div className="grid grid-cols-6 gap-1">
          {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1 text-center">
              <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-xs font-mono text-text-heading">{sb[ability]}</div>
              <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(sb[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      {sb.special_abilities?.length > 0 && (
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Special Abilities</div>
          {sb.special_abilities.map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}

      {sb.actions?.length > 0 && (
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Actions</div>
          {sb.actions.map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}

      {sb.legendary_actions?.length > 0 && (
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Legendary Actions</div>
          {sb.legendary_actions.map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function NPCSnapshot({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="text-sm space-y-1">
      <p className="text-xs text-text-secondary">
        {[data.race, data.occupation].filter(Boolean).join(' · ')}
      </p>
      {data.personality && (
        <p className="text-xs text-text-secondary italic">"{data.personality as string}"</p>
      )}
      {data.appearance && (
        <p className="text-xs text-text-muted">{data.appearance as string}</p>
      )}
      {data.notes && (
        <p className="text-xs text-text-muted">{data.notes as string}</p>
      )}
    </div>
  )
}

function SpellSnapshot({ data }: { data: Record<string, unknown> }) {
  const spellData = (data.spell_data ?? data) as Open5eSpell

  return (
    <div className="text-sm space-y-2">
      <div className="flex gap-2 text-xs text-text-secondary flex-wrap">
        <span>{data.level === 0 ? 'Cantrip' : `Level ${data.level}`}</span>
        <span>{data.school as string}</span>
        {data.concentration && <span className="text-info">Concentration</span>}
        {data.ritual && <span className="text-accent">Ritual</span>}
      </div>

      {spellData.casting_time && (
        <div className="grid grid-cols-2 gap-1.5 text-xs text-text-secondary">
          <div><span className="text-text-muted">Casting:</span> {spellData.casting_time}</div>
          <div><span className="text-text-muted">Range:</span> {spellData.range}</div>
          <div><span className="text-text-muted">Duration:</span> {spellData.duration}</div>
          <div><span className="text-text-muted">Components:</span> {data.components as string}</div>
        </div>
      )}

      {spellData.desc && (
        <p className="text-xs text-text-body whitespace-pre-line">{spellData.desc}</p>
      )}
    </div>
  )
}

function LocationSnapshot({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="text-sm space-y-1">
      {data.type && (
        <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
          {data.type as string}
        </span>
      )}
      {data.description && (
        <p className="text-xs text-text-secondary mt-1">{data.description as string}</p>
      )}
      {data.notes && (
        <p className="text-xs text-text-muted">{data.notes as string}</p>
      )}
    </div>
  )
}
