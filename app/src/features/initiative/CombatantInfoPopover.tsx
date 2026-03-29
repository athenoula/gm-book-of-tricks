import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { MonsterFullView } from '@/features/timeline/full-views/MonsterFullView'
import { NPCFullView } from '@/features/timeline/full-views/NPCFullView'

interface Props {
  sourceType: 'pc' | 'npc' | 'monster' | null
  sourceSnapshot: Record<string, unknown> | null
  combatantName: string
  combatantHp: number
  combatantHpMax: number
  combatantAc: number
  anchorRect: DOMRect | null
  onClose: () => void
}

export function CombatantInfoPopover({
  sourceType,
  sourceSnapshot,
  combatantName,
  combatantHp,
  combatantHpMax,
  combatantAc,
  anchorRect,
  onClose,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Position calculation
  const style = anchorRect ? getPopoverPosition(anchorRect) : {}

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Popover */}
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 w-[400px] max-w-[90vw] max-h-[60vh] overflow-y-auto bg-bg-base border border-amber-500/40 rounded-[--radius-lg] shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        style={style}
      >
        <div className="p-4">
          {sourceSnapshot && (sourceType === 'monster') && (
            <MonsterFullView data={sourceSnapshot} />
          )}
          {sourceSnapshot && (sourceType === 'npc' || sourceType === 'pc') && (
            <NPCFullView data={sourceSnapshot} />
          )}
          {!sourceSnapshot && (
            <MinimalCard
              name={combatantName}
              hp={combatantHp}
              hpMax={combatantHpMax}
              ac={combatantAc}
            />
          )}
        </div>
      </motion.div>
    </>,
    document.body,
  )
}

function MinimalCard({ name, hp, hpMax, ac }: { name: string; hp: number; hpMax: number; ac: number }) {
  return (
    <div className="text-sm space-y-2">
      <div className="text-text-heading font-medium">{name}</div>
      <div className="flex gap-4 text-xs text-text-secondary">
        <span><span className="text-text-muted">HP</span> {hp}/{hpMax}</span>
        <span><span className="text-text-muted">AC</span> {ac}</span>
      </div>
      <p className="text-xs text-text-muted italic">No source data available — combatant was added manually or before this feature.</p>
    </div>
  )
}

function getPopoverPosition(anchor: DOMRect): React.CSSProperties {
  const gap = 8
  const popoverHeight = 400 // estimate for flip logic
  const spaceBelow = window.innerHeight - anchor.bottom
  const placeAbove = spaceBelow < popoverHeight && anchor.top > popoverHeight

  const top = placeAbove
    ? Math.max(8, anchor.top - popoverHeight - gap)
    : anchor.bottom + gap

  const left = Math.max(8, Math.min(
    anchor.left + anchor.width / 2 - 200, // center the 400px popover
    window.innerWidth - 408, // 400 + 8px margin
  ))

  return { top, left }
}
