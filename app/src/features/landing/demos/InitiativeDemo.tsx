// src/features/landing/demos/InitiativeDemo.tsx
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const combatants = [
  { name: 'Alaric (Fighter)', initiative: 19, hp: 45, maxHp: 45, isPlayer: true },
  { name: 'Goblin Archer', initiative: 15, hp: 11, maxHp: 11, isPlayer: false },
  { name: 'Miriel (Cleric)', initiative: 12, hp: 38, maxHp: 38, isPlayer: true },
  { name: 'Bugbear Chief', initiative: 8, hp: 27, maxHp: 27, isPlayer: false },
]

export function InitiativeDemo({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    // Reveal combatants one by one
    combatants.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 400 + i * 500))
    })
    // HP damage on goblin
    timers.push(setTimeout(() => setStep(5), 400 + combatants.length * 500 + 800))
    // Add condition
    timers.push(setTimeout(() => setStep(6), 400 + combatants.length * 500 + 1800))
    // Advance turn
    timers.push(setTimeout(() => setStep(7), 400 + combatants.length * 500 + 2800))
    // Loop
    const loop = setInterval(() => {
      setStep(0)
      combatants.forEach((_, i) => {
        timers.push(setTimeout(() => setStep(i + 1), 400 + i * 500))
      })
      timers.push(setTimeout(() => setStep(5), 400 + combatants.length * 500 + 800))
      timers.push(setTimeout(() => setStep(6), 400 + combatants.length * 500 + 1800))
      timers.push(setTimeout(() => setStep(7), 400 + combatants.length * 500 + 2800))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  const shown = combatants.slice(0, Math.min(step, combatants.length))
  const activeTurn = step >= 7 ? 1 : 0

  return (
    <DemoFrame>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            INITIATIVE — ROUND 1
          </span>
        </div>
        {shown.map((c, i) => {
          const hpLost = step >= 5 && i === 1
          const hasCondition = step >= 6 && i === 1
          const currentHp = hpLost ? 4 : c.hp
          const hpPercent = (currentHp / c.maxHp) * 100

          return (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-2 p-2 rounded-[--radius-sm] border ${
                i === activeTurn
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-bg-raised/50'
              }`}
            >
              <span className="text-xs font-[family-name:--font-mono] text-text-muted w-5 text-center">
                {c.initiative}
              </span>
              <span
                className={`text-sm flex-1 ${
                  c.isPlayer
                    ? 'text-text-heading font-[family-name:--font-heading]'
                    : 'text-danger font-[family-name:--font-heading]'
                }`}
              >
                {c.name}
              </span>
              {hasCondition && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30"
                >
                  Prone
                </motion.span>
              )}
              <div className="w-16 flex items-center gap-1">
                <div className="flex-1 h-1.5 rounded-full bg-bg-deep overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${hpPercent > 50 ? 'bg-success' : hpPercent > 25 ? 'bg-warning' : 'bg-danger'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-[10px] font-[family-name:--font-mono] text-text-muted w-8 text-right">
                  {currentHp}/{c.maxHp}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </DemoFrame>
  )
}
