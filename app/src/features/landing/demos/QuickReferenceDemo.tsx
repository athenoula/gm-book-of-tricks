// src/features/landing/demos/QuickReferenceDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const entries = [
  { category: 'CONDITIONS', name: 'Blinded', description: 'Can\'t see. Auto-fail sight checks. Attacks have disadvantage, attacks against have advantage.' },
  { category: 'CONDITIONS', name: 'Frightened', description: 'Disadvantage on ability checks and attacks while source of fear is in line of sight.' },
  { category: 'CONDITIONS', name: 'Stunned', description: 'Incapacitated, can\'t move, speak only falteringly. Auto-fail STR/DEX saves. Attacks against have advantage.' },
  { category: 'ACTIONS', name: 'Dodge', description: 'Attacks against you have disadvantage. DEX saves have advantage. Lost if incapacitated or speed is 0.' },
]

const searchText = 'bli'

export function QuickReferenceDemo({ isVisible }: { isVisible: boolean }) {
  const [typedChars, setTypedChars] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState(-1)
  const [showAllEntries, setShowAllEntries] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    setTypedChars(0)
    setShowResults(false)
    setExpandedEntry(-1)
    setShowAllEntries(false)

    const timers: ReturnType<typeof setTimeout>[] = []

    // Show all entries first
    timers.push(setTimeout(() => setShowAllEntries(true), 600))
    // Start typing to filter
    timers.push(setTimeout(() => { setShowAllEntries(false); setShowResults(false) }, 3000))
    searchText.split('').forEach((_, i) => {
      timers.push(setTimeout(() => setTypedChars(i + 1), 3200 + i * 250))
    })
    // Show filtered result
    timers.push(setTimeout(() => setShowResults(true), 3200 + searchText.length * 250 + 400))
    // Expand entry
    timers.push(setTimeout(() => setExpandedEntry(0), 3200 + searchText.length * 250 + 1200))

    // Loop
    const loop = setInterval(() => {
      setTypedChars(0)
      setShowResults(false)
      setExpandedEntry(-1)
      setShowAllEntries(false)
      timers.push(setTimeout(() => setShowAllEntries(true), 600))
      timers.push(setTimeout(() => { setShowAllEntries(false); setShowResults(false) }, 3000))
      searchText.split('').forEach((_, i) => {
        timers.push(setTimeout(() => setTypedChars(i + 1), 3200 + i * 250))
      })
      timers.push(setTimeout(() => setShowResults(true), 3200 + searchText.length * 250 + 400))
      timers.push(setTimeout(() => setExpandedEntry(0), 3200 + searchText.length * 250 + 1200))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  const displayEntries = showAllEntries ? entries : (showResults ? [entries[0]] : [])

  return (
    <DemoFrame>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            QUICK REFERENCE
          </span>
          <span className="text-[10px] text-text-muted/60 font-[family-name:--font-mono]">
            ⌘J
          </span>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 p-2 rounded-[--radius-md] border border-border bg-bg-surface/50 mb-3">
          <span className="text-text-muted text-sm">⌕</span>
          <span className="text-sm text-text-body font-[family-name:--font-body]">
            {!showAllEntries && searchText.slice(0, typedChars)}
            {!showAllEntries && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block w-px h-4 bg-primary ml-px align-middle"
              />
            )}
            {showAllEntries && (
              <span className="text-text-muted">Search conditions, actions, rules...</span>
            )}
          </span>
        </div>

        {/* Results */}
        <AnimatePresence mode="popLayout">
          {displayEntries.map((entry, i) => (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: showAllEntries ? i * 0.06 : 0 }}
              className="mb-1.5"
            >
              <div
                className={`p-2 rounded-[--radius-sm] border ${
                  expandedEntry === i
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-bg-raised/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-heading font-[family-name:--font-heading]">
                    {entry.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-deep text-text-muted font-[family-name:--font-label] tracking-wider">
                    {entry.category}
                  </span>
                </div>
                {expandedEntry === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 pt-2 border-t border-border"
                  >
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {entry.description}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
