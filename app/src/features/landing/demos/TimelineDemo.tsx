// src/features/landing/demos/TimelineDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const scenes = [
  { label: 'Scene', title: 'Arrival at Thornwall', color: 'bg-primary/20 border-primary/30' },
  { label: 'Battle', title: 'Ambush at the Bridge', color: 'bg-danger/20 border-danger/30' },
  { label: 'NPC', title: 'Meeting Aldric the Sage', color: 'bg-info/20 border-info/30' },
  { label: 'Scene', title: 'The Hidden Library', color: 'bg-primary/20 border-primary/30' },
]

export function TimelineDemo({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []

    scenes.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 600 + i * 800))
    })
    // Reorder animation: swap items 1 and 2
    timers.push(setTimeout(() => setStep(5), 600 + scenes.length * 800 + 1000))
    // Reset and loop
    timers.push(
      setTimeout(() => setStep(0), 600 + scenes.length * 800 + 3000)
    )
    const loop = setInterval(() => {
      setStep(0)
      scenes.forEach((_, i) => {
        timers.push(setTimeout(() => setStep(i + 1), 600 + i * 800))
      })
      timers.push(setTimeout(() => setStep(5), 600 + scenes.length * 800 + 1000))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  const visibleScenes = scenes.slice(0, Math.min(step, scenes.length))
  // When step is 5, swap indices 1 and 2 to simulate drag
  const displayScenes = step >= 5
    ? [visibleScenes[0], visibleScenes[2], visibleScenes[1], visibleScenes[3]].filter(Boolean)
    : visibleScenes

  return (
    <DemoFrame>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            SESSION 4 — TIMELINE
          </span>
          <span className="text-[10px] text-text-muted/60 font-[family-name:--font-mono]">
            PREP MODE
          </span>
        </div>
        <AnimatePresence mode="popLayout">
          {displayScenes.map((scene, i) => (
            <motion.div
              key={scene.title}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-3 p-2.5 rounded-[--radius-md] border ${scene.color}`}
            >
              <span className="text-[10px] font-[family-name:--font-label] text-text-muted tracking-wider w-10">
                {scene.label.toUpperCase()}
              </span>
              <span className="text-sm text-text-heading font-[family-name:--font-heading]">
                {scene.title}
              </span>
              <span className="ml-auto text-text-muted/40 text-xs">⋮⋮</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
