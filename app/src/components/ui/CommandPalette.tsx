import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCommandPalette } from '@/lib/command-palette'
import { useTutorial } from '@/lib/tutorial'
import { useCheatSheet } from '@/lib/cheat-sheet'
import { useCommandPaletteSearch } from '@/hooks/useCommandPaletteSearch'
import { AnimatePresence, motion, ScaleIn } from '@/components/motion'
import { useIsMobile } from '@/hooks/useIsMobile'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiSparkles, GiSpikedDragonHead, GiThreeFriends,
  GiPositionMarker, GiScrollUnfurled, GiMagnifyingGlass, GiBookPile,
} from '@/components/ui/icons'

function getCampaignIdFromUrl(): string | null {
  const match = window.location.pathname.match(/\/campaign\/([^/]+)/)
  return match ? match[1] : null
}

const GROUP_ICONS: Record<string, IconComponent> = {
  spell: GiSparkles,
  monster: GiSpikedDragonHead,
  character: GiThreeFriends,
  npc: GiThreeFriends,
  location: GiPositionMarker,
  session: GiScrollUnfurled,
}

const NAV_MAP: Record<string, string> = {
  Spells: 'spellbook',
  Monsters: 'bestiary',
  Characters: 'characters',
  NPCs: 'characters',
  Locations: 'locations',
  Sessions: 'sessions',
}

export function CommandPalette() {
  const { isOpen, query, close, setQuery } = useCommandPalette()
  const isMobile = useIsMobile()
  const queryLower = query.toLowerCase()
  const showTourAction = query.length >= 2 &&
    ['tour', 'tutorial', 'help', 'guide'].some(k => k.startsWith(queryLower))
  const showCheatSheetAction = query.length >= 2 &&
    ['cheat', 'cheat sheet', 'dm', 'reference', 'rules'].some(k => k.startsWith(queryLower))
  const campaignId = useMemo(() => (isOpen ? getCampaignIdFromUrl() : null), [isOpen])
  const { data: groups } = useCommandPaletteSearch(query, campaignId)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const flatItems = useMemo(() => {
    if (!groups) return []
    return groups.flatMap((g) =>
      g.items.map((item) => ({ ...item, type: g.type }))
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

  const navigateToItem = useCallback(
    (type: string) => {
      if (!campaignId) return
      const segment = NAV_MAP[type]
      if (segment) {
        void navigate({ to: `/campaign/${campaignId}/${segment}` })
      }
      close()
    },
    [campaignId, close, navigate],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1 < flatItems.length ? i + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 >= 0 ? i - 1 : flatItems.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[selectedIndex]
        if (item) {
          navigateToItem(item.type)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [flatItems, selectedIndex, navigateToItem, close],
  )

  const innerContent = (
    <>
      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <span className="text-text-muted text-lg shrink-0">
          <GameIcon icon={GiMagnifyingGlass} size="lg" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campaigns..."
          className="flex-1 bg-transparent text-lg text-text-heading placeholder:text-text-muted outline-none"
        />
        {isMobile && (
          <button
            onClick={close}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-body hover:bg-bg-raised transition-colors cursor-pointer"
            aria-label="Close search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      <div className={isMobile ? 'flex-1 overflow-y-auto' : 'max-h-[360px] overflow-y-auto'}>
        {showTourAction && (
          <div className="py-2">
            <div className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
              Actions
            </div>
            <button
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-bg-raised cursor-pointer"
              onClick={() => {
                useTutorial.getState().start()
                close()
              }}
            >
              <GameIcon icon={GiScrollUnfurled} size="sm" />
              <span className="text-text-heading text-sm font-medium">Take the Tour</span>
              <span className="text-text-muted text-xs">Guided walkthrough</span>
            </button>
          </div>
        )}
        {showCheatSheetAction && (
          <div className="py-2">
            <div className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
              Actions
            </div>
            <button
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-bg-raised cursor-pointer"
              onClick={() => {
                useCheatSheet.getState().open()
                close()
              }}
            >
              <GameIcon icon={GiBookPile} size="sm" />
              <span className="text-text-heading text-sm font-medium">DM's Cheat Sheet</span>
              <span className="text-text-muted text-xs">Rules quick reference</span>
            </button>
          </div>
        )}
        {query.length < 2 ? (
          <div className="px-4 py-8 text-center text-text-muted text-sm">
            Type to search...
          </div>
        ) : !groups?.length ? (
          <div className="px-4 py-8 text-center text-text-muted text-sm">
            No results found
          </div>
        ) : (
          <div className="py-2">
            {groups.map((group) => {
              const groupStartIndex = flatItems.findIndex(
                (fi) =>
                  fi.type === group.type &&
                  fi.id === group.items[0]?.id,
              )
              return (
                <div key={group.type}>
                  <div className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
                    <GameIcon icon={GROUP_ICONS[group.icon]} size="sm" /> {group.type}
                  </div>
                  {group.items.map((item, i) => {
                    const flatIndex = groupStartIndex + i
                    const isSelected = flatIndex === selectedIndex
                    return (
                      <button
                        key={item.id}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-bg-raised'
                            : 'hover:bg-bg-raised'
                        }`}
                        onClick={() => navigateToItem(group.type)}
                        onMouseEnter={() =>
                          setSelectedIndex(flatIndex)
                        }
                      >
                        <span className="text-text-heading text-sm font-medium">
                          {item.name}
                        </span>
                        {item.subtitle && (
                          <span className="text-text-muted text-xs">
                            {item.subtitle}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
        <div className="flex items-center gap-3">
          {!isMobile && <span>{'\u2191\u2193'} navigate</span>}
          {!isMobile && <span>{'\u21B5'} open</span>}
          <span>esc close</span>
        </div>
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium">
          {isMobile ? 'ESC' : `${'\u2318'}K`}
        </kbd>
      </div>
    </>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50"
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
            <div className="flex items-start justify-center pt-[15vh]">
              <ScaleIn className="relative max-w-[540px] w-full">
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
