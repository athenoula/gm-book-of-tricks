// src/features/landing/demos/GeneratorsDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const npcResult = {
  name: 'Brenna Ashworth',
  race: 'Half-Elf',
  occupation: 'Traveling Herbalist',
  trait: 'Speaks in riddles when nervous',
  motivation: 'Searching for a rare cure',
  appearance: 'Silver-streaked hair, ink-stained fingers',
}

const fields = Object.entries(npcResult) as [string, string][]

export function GeneratorsDemo({ isVisible }: { isVisible: boolean }) {
  const [showButton, setShowButton] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revealedFields, setRevealedFields] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setShowButton(true)
    setGenerating(false)
    setRevealedFields(0)

    const timers: ReturnType<typeof setTimeout>[] = []

    // Press generate
    timers.push(setTimeout(() => { setShowButton(false); setGenerating(true) }, 1200))
    // Stop generating, start revealing fields
    timers.push(setTimeout(() => setGenerating(false), 1800))
    fields.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedFields(i + 1), 2000 + i * 400))
    })
    // Loop
    const loop = setInterval(() => {
      setShowButton(true)
      setGenerating(false)
      setRevealedFields(0)
      timers.push(setTimeout(() => { setShowButton(false); setGenerating(true) }, 1200))
      timers.push(setTimeout(() => setGenerating(false), 1800))
      fields.forEach((_, i) => {
        timers.push(setTimeout(() => setRevealedFields(i + 1), 2000 + i * 400))
      })
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  return (
    <DemoFrame>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            NPC GENERATOR
          </span>
        </div>

        {showButton && (
          <motion.div
            className="flex justify-center py-8"
            animate={{ scale: [1, 0.97, 1] }}
            transition={{ duration: 0.3, delay: 1.0 }}
          >
            <div className="px-5 py-2.5 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold">
              Generate NPC
            </div>
          </motion.div>
        )}

        {generating && (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
            />
          </div>
        )}

        <AnimatePresence>
          {!showButton && !generating && (
            <div className="space-y-2">
              {fields.slice(0, revealedFields).map(([key, value], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2"
                >
                  <span className="text-[10px] font-[family-name:--font-label] text-text-muted tracking-wider w-20 pt-0.5 text-right shrink-0">
                    {key.toUpperCase()}
                  </span>
                  <span className="text-sm text-text-body">{value}</span>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
