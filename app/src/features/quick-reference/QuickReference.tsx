import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion, ScaleIn } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import {
  GiSparkles, GiSpikedDragonHead, GiThreeFriends,
  GiPositionMarker, GiMagnifyingGlass, GiBoltShield,
} from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'
import { useQuickReference } from '@/lib/quick-reference'
import { useQuickReferenceSearch } from './useQuickReferenceSearch'
import { QuickReferenceDetail } from './QuickReferenceDetail'
import { useBulkImportAbilities } from './useAbilities'
import type { SearchGroup } from './useQuickReferenceSearch'

function getCampaignIdFromUrl(): string | null {
  const hash = window.location.hash
  const match = hash.match(/\/campaign\/([^/]+)/)
  return match ? match[1] : null
}

function getSessionIdFromUrl(): string | null {
  const hash = window.location.hash
  const match = hash.match(/\/session\/([^/]+)/)
  return match ? match[1] : null
}

const GROUP_ICONS: Record<string, IconComponent> = {
  spell: GiSparkles,
  monster: GiSpikedDragonHead,
  character: GiThreeFriends,
  npc: GiThreeFriends,
  ability: GiBoltShield,
  location: GiPositionMarker,
}

// Suppress unused import warning — SearchGroup is used as a type-only import
type _SearchGroup = SearchGroup

export function QuickReference() {
  const { isOpen, query, selectedItem, close, setQuery, selectItem } = useQuickReference()
  const campaignId = useMemo(() => (isOpen ? getCampaignIdFromUrl() : null), [isOpen])
  const sessionId = useMemo(() => (isOpen ? getSessionIdFromUrl() : null), [isOpen])
  const { data: groups } = useQuickReferenceSearch(query, campaignId)
  const bulkImport = useBulkImportAbilities()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [importingAbilities, setImportingAbilities] = useState(false)

  const hasAbilityResults = groups?.some((g) => g.type === 'ability') ?? false
  const hasAnyResults = (groups?.length ?? 0) > 0
  const showAbilityImportPrompt = query.length >= 2 && !hasAbilityResults && hasAnyResults

  const handleImportAbilities = () => {
    if (!campaignId || importingAbilities) return
    setImportingAbilities(true)
    bulkImport.mutate(
      { campaignId },
      {
        onSettled: () => setImportingAbilities(false),
      },
    )
  }

  const flatItems = useMemo(() => {
    if (!groups) return []
    return groups.flatMap((g) =>
      g.items.map((item) => ({ ...item, groupType: g.type }))
    )
  }, [groups])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  // Auto-select first result
  useEffect(() => {
    if (flatItems.length > 0 && !selectedItem) {
      const first = flatItems[0]
      selectItem({ id: first.id, type: first.groupType })
    }
  }, [flatItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const newIndex = selectedIndex + 1 < flatItems.length ? selectedIndex + 1 : 0
        setSelectedIndex(newIndex)
        const item = flatItems[newIndex]
        if (item) selectItem({ id: item.id, type: item.groupType })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const newIndex = selectedIndex - 1 >= 0 ? selectedIndex - 1 : flatItems.length - 1
        setSelectedIndex(newIndex)
        const item = flatItems[newIndex]
        if (item) selectItem({ id: item.id, type: item.groupType })
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [flatItems, selectedIndex, selectItem, close],
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          <ScaleIn className="relative max-w-[800px] w-full">
            <div className="bg-bg-base rounded-xl border border-border shadow-lg overflow-hidden">
              {/* Search bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <span className="text-text-muted text-lg shrink-0">
                  <GameIcon icon={GiMagnifyingGlass} size="lg" />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search spells, monsters, abilities, characters..."
                  className="flex-1 bg-transparent text-lg text-text-heading placeholder:text-text-muted outline-none"
                />
                <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
                  ESC
                </kbd>
              </div>

              {/* Split pane */}
              <div className="grid grid-cols-[240px_1fr] min-h-[380px] max-h-[60vh] overflow-hidden">
                {/* Left: Results */}
                <div className="border-r border-border overflow-y-auto min-h-0">
                  {query.length < 2 ? (
                    <div className="px-4 py-8 text-center text-text-muted text-sm">
                      Type to search...
                    </div>
                  ) : !groups?.length ? (
                    <div className="px-4 py-8 text-center text-text-muted text-sm">
                      No results found
                    </div>
                  ) : (
                    <div className="py-1">
                      {groups.map((group) => {
                        const groupStartIndex = flatItems.findIndex(
                          (fi) => fi.groupType === group.type && fi.id === group.items[0]?.id,
                        )
                        return (
                          <div key={group.label}>
                            <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">
                              <GameIcon icon={GROUP_ICONS[group.icon] ?? GiSparkles} size="xs" /> {group.label}
                            </div>
                            {group.items.map((item, i) => {
                              const flatIndex = groupStartIndex + i
                              const isSelected = selectedItem?.id === item.id && selectedItem?.type === group.type
                              return (
                                <button
                                  key={item.id}
                                  className={`w-full text-left px-3 py-2 cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary-ghost border-l-2 border-primary'
                                      : 'border-l-2 border-transparent hover:bg-bg-raised'
                                  }`}
                                  onClick={() => {
                                    setSelectedIndex(flatIndex)
                                    selectItem({ id: item.id, type: group.type })
                                  }}
                                  onMouseEnter={() => setSelectedIndex(flatIndex)}
                                >
                                  <div className="text-sm text-text-heading font-medium">{item.name}</div>
                                  {item.subtitle && (
                                    <div className="text-[11px] text-text-muted">{item.subtitle}</div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Ability import prompt */}
                  {showAbilityImportPrompt && (
                    <div className="px-3 py-3 border-t border-border">
                      <p className="text-[11px] text-text-muted mb-1.5">No abilities found in campaign</p>
                      <button
                        onClick={handleImportAbilities}
                        disabled={importingAbilities}
                        className="text-[11px] text-primary-light hover:text-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importingAbilities ? 'Importing...' : 'Import SRD abilities?'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Detail */}
                <div className="overflow-hidden flex flex-col min-h-0">
                  {selectedItem && campaignId ? (
                    <QuickReferenceDetail
                      type={selectedItem.type}
                      id={selectedItem.id}
                      campaignId={campaignId}
                      sessionId={sessionId}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                      Select an item to view details
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <span>↑↓ navigate</span>
                  <span>esc close</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium">⌘J</kbd>
              </div>
            </div>
          </ScaleIn>
        </div>
      )}
    </AnimatePresence>
  )
}
