import { useEffect } from 'react'
import { AnimatePresence, motion, ScaleIn } from '@/components/motion'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useCheatSheet } from '@/lib/cheat-sheet'
import type { CheatSheetTab } from '@/lib/cheat-sheet'
import {
  SKILL_GROUPS,
  CONDITIONS,
  EXHAUSTION_LEVELS,
  COVER_RULES,
  DC_GUIDELINES,
  TRAVEL_PACE,
  COMMON_ITEMS,
  TAB_CONFIG,
} from './cheatSheetData'

function SkillsTab() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILL_GROUPS.map((group) => (
          <div key={group.abilityShort} className="bg-bg-raised rounded-[--radius-md] p-3">
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-primary/15 text-primary mb-2">
              {group.abilityShort}
            </span>
            {group.skills.length > 0 ? (
              <ul className="space-y-1">
                {group.skills.map((skill) => (
                  <li key={skill} className="text-sm text-text-body">{skill}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted italic">No skills — CON saves only</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-3">Contested checks: both sides roll, highest wins.</p>
    </div>
  )
}

function ConditionsTab() {
  return (
    <div>
      <div className="space-y-2">
        {CONDITIONS.map((c) => (
          <div key={c.name} className="bg-bg-raised rounded-[--radius-md] px-3 py-2">
            <span className="text-sm font-medium text-text-heading">{c.name}</span>
            <span className="text-sm text-text-muted"> — {c.description}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-bg-raised rounded-[--radius-md] p-3">
        <p className="text-sm font-medium text-text-heading mb-2">Exhaustion</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted text-xs">
              <th className="pb-1 pr-4">Level</th>
              <th className="pb-1">Effect</th>
            </tr>
          </thead>
          <tbody>
            {EXHAUSTION_LEVELS.map((e) => (
              <tr key={e.level} className="border-t border-border/50">
                <td className="py-1 pr-4 font-mono text-primary">{e.level}</td>
                <td className="py-1 text-text-body">{e.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-text-muted mt-2">Effects are cumulative.</p>
      </div>
    </div>
  )
}

function CoverTab() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-muted text-xs">
          <th className="pb-2 pr-4">Type</th>
          <th className="pb-2 pr-4">Bonus</th>
          <th className="pb-2">Example</th>
        </tr>
      </thead>
      <tbody>
        {COVER_RULES.map((c) => (
          <tr key={c.type} className="border-t border-border/50">
            <td className="py-2 pr-4 font-medium text-text-heading">{c.type}</td>
            <td className="py-2 pr-4 text-primary font-mono">{c.bonus}</td>
            <td className="py-2 text-text-muted">{c.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DCsTab() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-muted text-xs">
          <th className="pb-2 pr-4">Difficulty</th>
          <th className="pb-2">DC</th>
        </tr>
      </thead>
      <tbody>
        {DC_GUIDELINES.map((d) => (
          <tr key={d.dc} className="border-t border-border/50">
            <td className="py-2 pr-4 text-text-heading">{d.difficulty}</td>
            <td className="py-2 font-mono text-primary font-bold text-lg">{d.dc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TravelTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted text-xs">
            <th className="pb-2 pr-3">Pace</th>
            <th className="pb-2 pr-3">/ Min</th>
            <th className="pb-2 pr-3">/ Hour</th>
            <th className="pb-2 pr-3">/ Day</th>
            <th className="pb-2">Effect</th>
          </tr>
        </thead>
        <tbody>
          {TRAVEL_PACE.map((t) => (
            <tr key={t.pace} className="border-t border-border/50">
              <td className="py-2 pr-3 font-medium text-text-heading">{t.pace}</td>
              <td className="py-2 pr-3 font-mono text-text-body">{t.perMinute}</td>
              <td className="py-2 pr-3 font-mono text-text-body">{t.perHour}</td>
              <td className="py-2 pr-3 font-mono text-text-body">{t.perDay}</td>
              <td className="py-2 text-text-muted">{t.effect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ItemsTab() {
  return (
    <div className="space-y-4">
      {COMMON_ITEMS.map((group) => (
        <div key={group.category}>
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 font-label">
            {group.category}
          </h4>
          <div className="bg-bg-raised rounded-[--radius-md] overflow-hidden">
            {group.items.map((item, i) => (
              <div
                key={item.name}
                className={`flex items-center justify-between px-3 py-1.5 text-sm ${
                  i > 0 ? 'border-t border-border/50' : ''
                }`}
              >
                <span className="text-text-body">{item.name}</span>
                <span className="font-mono text-primary text-xs">{item.cost}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TAB_CONTENT: Record<CheatSheetTab, () => JSX.Element> = {
  skills: SkillsTab,
  conditions: ConditionsTab,
  cover: CoverTab,
  dcs: DCsTab,
  travel: TravelTab,
  items: ItemsTab,
}

export function CheatSheet() {
  const { isOpen, activeTab, close, setTab } = useCheatSheet()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  const ActiveContent = TAB_CONTENT[activeTab]

  const innerContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-heading text-text-heading">DM's Cheat Sheet</h2>
        {isMobile ? (
          <button
            onClick={close}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-body hover:bg-bg-raised transition-colors cursor-pointer"
            aria-label="Close cheat sheet"
          >
            ✕
          </button>
        ) : (
          <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
            ESC
          </kbd>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border px-2 gap-1" role="tablist">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`px-3 py-2 text-sm whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary font-medium'
                : 'text-text-muted hover:text-text-body'
            }`}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`overflow-y-auto p-4 ${isMobile ? 'flex-1' : 'max-h-[60vh]'}`}>
        <ActiveContent />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
        <div className="flex items-center gap-3">
          {!isMobile && <span>esc close</span>}
        </div>
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium">
          {isMobile ? 'ESC' : '\u2318L'}
        </kbd>
      </div>
    </>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50"
        >
          <motion.div
            className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          {isMobile ? (
            <motion.div
              className="absolute inset-0 bg-bg-base flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {innerContent}
            </motion.div>
          ) : (
            <div className="flex items-start justify-center pt-[10vh]">
              <ScaleIn className="relative max-w-[700px] w-full mx-4">
                <div className="bg-bg-base rounded-xl border border-border shadow-lg overflow-hidden">
                  {innerContent}
                </div>
              </ScaleIn>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  )
}
