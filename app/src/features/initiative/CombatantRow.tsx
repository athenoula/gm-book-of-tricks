import { useState } from 'react'
import { motion } from 'motion/react'
import { CONDITIONS } from '@/lib/dnd'
import { useUpdateCombatant, useRemoveCombatant } from './useCombatants'
import type { Combatant } from './useCombatants'

interface Props {
  combatant: Combatant
  isActive: boolean
  inCombat: boolean
}

export function CombatantRow({ combatant, isActive, inCombat }: Props) {
  const [showConditions, setShowConditions] = useState(false)
  const updateCombatant = useUpdateCombatant()
  const removeCombatant = useRemoveCombatant()

  const isDowned = combatant.hp_current <= 0 && combatant.hp_max > 0
  const hpPercent = combatant.hp_max > 0
    ? Math.max(0, Math.min(100, (combatant.hp_current / combatant.hp_max) * 100))
    : 100

  const adjustHp = (delta: number) => {
    const newHp = Math.max(0, Math.min(combatant.hp_max, combatant.hp_current + delta))
    updateCombatant.mutate({ id: combatant.id, hp_current: newHp })
  }

  const toggleCondition = (conditionName: string) => {
    const current = combatant.conditions
    const updated = current.includes(conditionName)
      ? current.filter((c) => c !== conditionName)
      : [...current, conditionName]
    updateCombatant.mutate({ id: combatant.id, conditions: updated })
  }

  const handleRemove = () => {
    removeCombatant.mutate({ id: combatant.id, campaignId: combatant.campaign_id })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className={`
        rounded-[--radius-md] border p-3 transition-colors
        ${isActive && inCombat
          ? 'border-primary bg-primary-ghost'
          : 'border-border bg-bg-base'
        }
        ${isDowned ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Initiative badge */}
        <div className={`
          w-10 h-10 rounded-[--radius-sm] flex items-center justify-center text-sm font-mono font-semibold flex-shrink-0
          ${combatant.is_player ? 'bg-info/15 text-info' : 'bg-danger/15 text-danger'}
        `}>
          {combatant.initiative}
        </div>

        {/* Name + conditions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${isDowned ? 'line-through' : 'text-text-heading'}`}>
              {combatant.name}
            </span>
            {combatant.is_player && (
              <span className="text-[10px] text-info bg-info/10 px-1.5 py-0.5 rounded-[--radius-sm]">PC</span>
            )}
          </div>

          {/* Condition badges */}
          {combatant.conditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {combatant.conditions.map((cond) => {
                const condDef = CONDITIONS.find((c) => c.name === cond)
                return (
                  <button
                    key={cond}
                    onClick={() => toggleCondition(cond)}
                    className="text-[10px] px-1.5 py-0.5 rounded-[--radius-sm] cursor-pointer hover:opacity-70 transition-opacity"
                    style={{
                      backgroundColor: `${condDef?.color ?? '#6b7280'}20`,
                      color: condDef?.color ?? '#6b7280',
                    }}
                    title={`Remove ${cond}`}
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
          <div className="text-[10px] text-text-muted uppercase">AC</div>
          <div className="text-sm font-mono text-text-secondary">{combatant.armor_class}</div>
        </div>

        {/* HP controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => adjustHp(-1)}
            className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-[--radius-sm] bg-danger/10 text-danger hover:bg-danger/20 transition-colors text-sm cursor-pointer flex items-center justify-center"
          >
            −
          </button>

          <div className="w-16 text-center">
            <div className="text-sm font-mono text-text-heading">
              {combatant.hp_current}/{combatant.hp_max}
            </div>
            {/* HP bar */}
            <div className="h-1 bg-bg-raised rounded-full mt-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  hpPercent > 50 ? 'bg-success' : hpPercent > 25 ? 'bg-warning' : 'bg-danger'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => adjustHp(1)}
            className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-[--radius-sm] bg-success/10 text-success hover:bg-success/20 transition-colors text-sm cursor-pointer flex items-center justify-center"
          >
            +
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowConditions(!showConditions)}
            className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-[--radius-sm] bg-bg-raised text-text-muted hover:text-text-body hover:bg-bg-surface transition-colors text-xs cursor-pointer flex items-center justify-center"
            title="Conditions"
          >
            ◆
          </button>
          <button
            onClick={handleRemove}
            className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-[--radius-sm] bg-bg-raised text-text-muted hover:text-danger hover:bg-danger/10 transition-colors text-xs cursor-pointer flex items-center justify-center"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Conditions dropdown */}
      {showConditions && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((cond) => {
              const active = combatant.conditions.includes(cond.name)
              return (
                <button
                  key={cond.name}
                  onClick={() => toggleCondition(cond.name)}
                  className={`
                    text-[11px] px-2 py-1 rounded-[--radius-sm] cursor-pointer transition-all
                    ${active
                      ? 'ring-1'
                      : 'opacity-50 hover:opacity-80'
                    }
                  `}
                  style={{
                    backgroundColor: `${cond.color}${active ? '30' : '15'}`,
                    color: cond.color,
                    ...(active ? { ringColor: cond.color } : {}),
                  }}
                >
                  {cond.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
