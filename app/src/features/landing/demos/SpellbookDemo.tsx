// src/features/landing/demos/SpellbookDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const allSpells = [
  { name: 'Fireball', level: 3, school: 'Evocation', match: true },
  { name: 'Fire Bolt', level: 0, school: 'Evocation', match: true },
  { name: 'Fire Shield', level: 4, school: 'Evocation', match: true },
  { name: 'Fire Storm', level: 7, school: 'Evocation', match: true },
]

const searchText = 'fire'

export function SpellbookDemo({ isVisible }: { isVisible: boolean }) {
  const [typedChars, setTypedChars] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [expandedSpell, setExpandedSpell] = useState(-1)

  useEffect(() => {
    if (!isVisible) return
    setTypedChars(0)
    setShowResults(false)
    setExpandedSpell(-1)

    const timers: ReturnType<typeof setTimeout>[] = []

    // Type search characters
    searchText.split('').forEach((_, i) => {
      timers.push(setTimeout(() => setTypedChars(i + 1), 800 + i * 200))
    })
    // Show results
    timers.push(setTimeout(() => setShowResults(true), 800 + searchText.length * 200 + 400))
    // Expand first spell
    timers.push(setTimeout(() => setExpandedSpell(0), 800 + searchText.length * 200 + 1800))
    // Loop
    const loop = setInterval(() => {
      setTypedChars(0)
      setShowResults(false)
      setExpandedSpell(-1)
      searchText.split('').forEach((_, i) => {
        timers.push(setTimeout(() => setTypedChars(i + 1), 800 + i * 200))
      })
      timers.push(setTimeout(() => setShowResults(true), 800 + searchText.length * 200 + 400))
      timers.push(setTimeout(() => setExpandedSpell(0), 800 + searchText.length * 200 + 1800))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  return (
    <DemoFrame>
      <div>
        {/* Search input */}
        <div className="flex items-center gap-2 p-2 rounded-[--radius-md] border border-border bg-bg-surface/50 mb-3">
          <span className="text-text-muted text-sm">⌕</span>
          <span className="text-sm text-text-body font-[family-name:--font-body]">
            {searchText.slice(0, typedChars)}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-px h-4 bg-primary ml-px align-middle"
            />
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 mb-3">
          {['All Levels', 'Evocation', 'Wizard'].map((chip, i) => (
            <span
              key={chip}
              className={`text-[10px] px-2 py-1 rounded-full border ${
                i > 0
                  ? 'border-primary/30 bg-primary/10 text-primary-light'
                  : 'border-border text-text-muted'
              }`}
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Results */}
        <AnimatePresence>
          {showResults && (
            <div className="space-y-1.5">
              {allSpells.map((spell, i) => (
                <motion.div
                  key={spell.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.08 }}
                >
                  <div
                    className={`p-2 rounded-[--radius-sm] border ${
                      expandedSpell === i
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-bg-raised/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-heading font-[family-name:--font-heading]">
                        {spell.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">{spell.school}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-deep text-text-secondary font-[family-name:--font-mono]">
                          Lvl {spell.level}
                        </span>
                      </div>
                    </div>
                    {expandedSpell === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 pt-2 border-t border-border"
                      >
                        <p className="text-xs text-text-secondary leading-relaxed">
                          A bright streak flashes from your pointing finger to a point you choose
                          within range and then blossoms with a low roar into an explosion of flame.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
