import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CONDITIONS } from '@/lib/dnd'
import type { TimelineBlock } from './useTimelineBlocks'
import { useUpdateTimelineBlock } from './useTimelineBlocks'
import { CombatantInfoPopover } from '@/features/initiative/CombatantInfoPopover'

interface SnapshotCombatant {
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  armor_class: number
  is_player: boolean
  conditions: string[]
  source_snapshot?: Record<string, unknown>
}

interface Props {
  block: TimelineBlock
}

export function InlineBattle({ block }: Props) {
  const updateBlock = useUpdateTimelineBlock()
  const snapshot = block.content_snapshot as {
    combatants?: SnapshotCombatant[]
    round?: number
    active_index?: number
    in_combat?: boolean
  }

  // Local state for combat — initialised from snapshot
  const [combatants, setCombatants] = useState<SnapshotCombatant[]>(
    () => (snapshot.combatants ?? []).sort((a, b) => b.initiative - a.initiative)
  )
  const [round, setRound] = useState(snapshot.round ?? 1)
  const [activeIndex, setActiveIndex] = useState(snapshot.active_index ?? 0)
  const [inCombat, setInCombat] = useState(snapshot.in_combat ?? false)

  const [popoverIndex, setPopoverIndex] = useState<number | null>(null)
  const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null)

  const popoverCombatant = popoverIndex !== null ? combatants[popoverIndex] : null

  // Persist state back to the timeline block
  const saveState = (
    updatedCombatants: SnapshotCombatant[],
    updatedRound: number,
    updatedActiveIndex: number,
    updatedInCombat: boolean,
  ) => {
    updateBlock.mutate({
      id: block.id,
      title: block.title,
    })
    // Update the content_snapshot via a separate call
    // We need to use the raw supabase client for JSONB update
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('timeline_blocks').update({
        content_snapshot: {
          ...block.content_snapshot,
          combatants: updatedCombatants,
          round: updatedRound,
          active_index: updatedActiveIndex,
          in_combat: updatedInCombat,
        },
      }).eq('id', block.id).then(() => {})
    })
  }

  const startCombat = () => {
    setInCombat(true)
    setRound(1)
    setActiveIndex(0)
    saveState(combatants, 1, 0, true)
  }

  const nextTurn = () => {
    const next = activeIndex + 1
    if (next >= combatants.length) {
      const newRound = round + 1
      setActiveIndex(0)
      setRound(newRound)
      saveState(combatants, newRound, 0, true)
    } else {
      setActiveIndex(next)
      saveState(combatants, round, next, true)
    }
  }

  const endCombat = () => {
    setInCombat(false)
    saveState(combatants, round, activeIndex, false)
  }

  const adjustHp = (index: number, delta: number) => {
    const updated = combatants.map((c, i) => {
      if (i !== index) return c
      return { ...c, hp_current: Math.max(0, Math.min(c.hp_max, c.hp_current + delta)) }
    })
    setCombatants(updated)
    saveState(updated, round, activeIndex, inCombat)
  }

  const toggleCondition = (index: number, condition: string) => {
    const updated = combatants.map((c, i) => {
      if (i !== index) return c
      const conditions = c.conditions.includes(condition)
        ? c.conditions.filter((x) => x !== condition)
        : [...c.conditions, condition]
      return { ...c, conditions }
    })
    setCombatants(updated)
    saveState(updated, round, activeIndex, inCombat)
  }

  if (combatants.length === 0) {
    return <p className="text-xs text-text-muted italic">No combatants in this encounter.</p>
  }

  return (
    <div>
      {/* Combat controls */}
      <div className="flex items-center gap-2 mb-3">
        {!inCombat ? (
          <Button size="sm" onClick={startCombat}>Start Combat</Button>
        ) : (
          <>
            <span className="text-xs text-text-secondary font-mono">Round {round}</span>
            <Button size="sm" onClick={nextTurn}>Next Turn</Button>
            <Button size="sm" variant="secondary" onClick={endCombat}>End</Button>
          </>
        )}
      </div>

      {/* Combatant rows */}
      <div className="space-y-1.5">
        {combatants.map((c, index) => {
          const isActive = inCombat && index === activeIndex
          const isDowned = c.hp_current <= 0 && c.hp_max > 0
          const hpPercent = c.hp_max > 0 ? Math.max(0, (c.hp_current / c.hp_max) * 100) : 100

          return (
            <CombatantInlineRow
              key={`${c.name}-${index}`}
              combatant={c}
              isActive={isActive}
              isDowned={isDowned}
              hpPercent={hpPercent}
              onAdjustHp={(delta) => adjustHp(index, delta)}
              onToggleCondition={(cond) => toggleCondition(index, cond)}
              onShowInfo={(rect) => {
                setPopoverIndex(index)
                setPopoverAnchorRect(rect)
              }}
            />
          )
        })}
      </div>

      {/* Info Popover */}
      {popoverCombatant && (
        <CombatantInfoPopover
          sourceType={popoverCombatant.source_snapshot ? (popoverCombatant.source_snapshot.is_pc ? 'pc' : popoverCombatant.source_snapshot.stat_block ? 'monster' : 'npc') as 'pc' | 'npc' | 'monster' : null}
          sourceSnapshot={popoverCombatant.source_snapshot ?? null}
          combatantName={popoverCombatant.name}
          combatantHp={popoverCombatant.hp_current}
          combatantHpMax={popoverCombatant.hp_max}
          combatantAc={popoverCombatant.armor_class}
          anchorRect={popoverAnchorRect}
          onClose={() => { setPopoverIndex(null); setPopoverAnchorRect(null) }}
        />
      )}
    </div>
  )
}

function CombatantInlineRow({ combatant, isActive, isDowned, hpPercent, onAdjustHp, onToggleCondition, onShowInfo }: {
  combatant: SnapshotCombatant
  isActive: boolean
  isDowned: boolean
  hpPercent: number
  onAdjustHp: (delta: number) => void
  onToggleCondition: (cond: string) => void
  onShowInfo?: (rect: DOMRect) => void
}) {
  const [showConditions, setShowConditions] = useState(false)

  return (
    <div className={`rounded-[--radius-md] border p-2.5 transition-colors ${
      isActive ? 'border-primary bg-primary-ghost' : 'border-border bg-bg-raised'
    } ${isDowned ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        {/* Initiative */}
        <div className={`w-8 h-8 rounded-[--radius-sm] flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 ${
          combatant.is_player ? 'bg-info/15 text-info' : 'bg-danger/15 text-danger'
        }`}>
          {combatant.initiative}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <button
            onClick={(e) => onShowInfo?.((e.currentTarget as HTMLElement).getBoundingClientRect())}
            className={`text-sm font-medium truncate block cursor-pointer hover:underline hover:decoration-amber-500/50 ${isDowned ? 'line-through' : 'text-text-heading'}`}
          >
            {combatant.name}
          </button>
          {combatant.conditions.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-0.5">
              {combatant.conditions.map((cond) => {
                const def = CONDITIONS.find((c) => c.name === cond)
                return (
                  <button
                    key={cond}
                    onClick={() => onToggleCondition(cond)}
                    className="text-[9px] px-1 py-0.5 rounded cursor-pointer hover:opacity-70"
                    style={{ backgroundColor: `${def?.color ?? '#6b7280'}20`, color: def?.color ?? '#6b7280' }}
                  >
                    {cond}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* AC */}
        <div className="text-center flex-shrink-0">
          <div className="text-[9px] text-text-muted">AC</div>
          <div className="text-xs font-mono text-text-secondary">{combatant.armor_class}</div>
        </div>

        {/* HP */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onAdjustHp(-1)} className="w-6 h-6 rounded-[--radius-sm] bg-danger/10 text-danger text-xs flex items-center justify-center cursor-pointer hover:bg-danger/20 max-md:w-11 max-md:h-11">−</button>
          <div className="w-14 text-center">
            <div className="text-xs font-mono text-text-heading">{combatant.hp_current}/{combatant.hp_max}</div>
            <div className="h-1 bg-bg-surface rounded-full mt-0.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${hpPercent > 50 ? 'bg-success' : hpPercent > 25 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
          <button onClick={() => onAdjustHp(1)} className="w-6 h-6 rounded-[--radius-sm] bg-success/10 text-success text-xs flex items-center justify-center cursor-pointer hover:bg-success/20 max-md:w-11 max-md:h-11">+</button>
        </div>

        {/* Conditions toggle */}
        <button
          onClick={() => setShowConditions(!showConditions)}
          className="w-6 h-6 rounded-[--radius-sm] bg-bg-surface text-text-muted text-xs flex items-center justify-center cursor-pointer hover:text-text-body max-md:w-11 max-md:h-11"
        >
          ◆
        </button>
      </div>

      {showConditions && (
        <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-1">
          {CONDITIONS.map((cond) => {
            const active = combatant.conditions.includes(cond.name)
            return (
              <button
                key={cond.name}
                onClick={() => onToggleCondition(cond.name)}
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${active ? 'ring-1' : 'opacity-50 hover:opacity-80'}`}
                style={{ backgroundColor: `${cond.color}${active ? '30' : '15'}`, color: cond.color }}
              >
                {cond.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
