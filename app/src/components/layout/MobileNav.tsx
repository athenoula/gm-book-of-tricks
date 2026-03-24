import { useState, useRef, useEffect } from 'react'
import { Link, useMatches } from '@tanstack/react-router'
import { motion } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiCrossedSwords, GiScrollUnfurled, GiThreeFriends, GiMagnifyingGlass,
  GiBoltShield, GiSpikedDragonHead, GiSparkles, GiPositionMarker,
  GiRollingDices, GiNotebook, GiOpenBook,
} from '@/components/ui/icons'
import { useCommandPalette } from '@/lib/command-palette'
import { useQuickReference } from '@/lib/quick-reference'
import { ChapterPicker } from '@/features/tutorial/ChapterPicker'

type NavItemDef = {
  kind: 'nav'
  icon: IconComponent
  label: string
  to: string
}

type UtilityItemDef = {
  kind: 'utility'
  icon: IconComponent
  label: string
  action: string // key used to dispatch actions
  dataTutorial?: string
  ariaLabel: string
}

type ItemDef = NavItemDef | UtilityItemDef

const items: ItemDef[] = [
  { kind: 'nav', icon: GiCrossedSwords, label: 'Overview', to: '/campaign/$campaignId' },
  { kind: 'nav', icon: GiScrollUnfurled, label: 'Sessions', to: '/campaign/$campaignId/sessions' },
  { kind: 'nav', icon: GiThreeFriends, label: 'Characters', to: '/campaign/$campaignId/characters' },
  { kind: 'utility', icon: GiMagnifyingGlass, label: 'Search', action: 'search', dataTutorial: 'mobile-search', ariaLabel: 'Open search' },
  { kind: 'utility', icon: GiBoltShield, label: 'Reference', action: 'reference', dataTutorial: 'mobile-ref', ariaLabel: 'Open quick reference' },
  { kind: 'nav', icon: GiSpikedDragonHead, label: 'Bestiary', to: '/campaign/$campaignId/bestiary' },
  { kind: 'nav', icon: GiSparkles, label: 'Spellbook', to: '/campaign/$campaignId/spellbook' },
  { kind: 'nav', icon: GiPositionMarker, label: 'Locations', to: '/campaign/$campaignId/locations' },
  { kind: 'nav', icon: GiRollingDices, label: 'Generators', to: '/campaign/$campaignId/generators' },
  { kind: 'nav', icon: GiNotebook, label: 'Scratchpad', to: '/campaign/$campaignId/scratchpad' },
  { kind: 'utility', icon: GiOpenBook, label: 'Tour', action: 'tour', ariaLabel: 'Open guided tour' },
]

export function MobileNav({ campaignId }: { campaignId: string }) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(true)
  const [showChapterPicker, setShowChapterPicker] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
      setShowFade(!atEnd)
    }

    handleScroll()
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const handleUtilityAction = (action: string) => {
    switch (action) {
      case 'search':
        useCommandPalette.getState().open()
        break
      case 'reference':
        useQuickReference.getState().open()
        break
      case 'tour':
        setShowChapterPicker((v) => !v)
        break
    }
  }

  return (
    <>
      <nav
        role="tablist"
        className="fixed bottom-0 left-0 right-0 z-40 bg-bg-base/95 backdrop-blur-sm border-t border-border md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="relative">
          <div
            ref={scrollRef}
            data-tutorial="mobile-nav"
            className="flex overflow-x-auto scrollbar-hide"
          >
            {items.map((item) => {
              if (item.kind === 'nav') {
                const resolvedTo = item.to.replace('$campaignId', campaignId)
                const isActive = currentPath === item.to

                return (
                  <Link
                    key={item.to}
                    to={resolvedTo}
                    className={`
                      flex-shrink-0 w-[64px] flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center relative
                      transition-colors duration-[--duration-fast]
                      ${isActive ? 'text-primary-light' : 'text-text-muted'}
                    `}
                  >
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <GameIcon icon={item.icon} size="lg" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </motion.div>
                    {isActive && (
                      <motion.div
                        className="absolute bottom-1 h-0.5 w-6 bg-primary-light rounded-full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                )
              }

              // Utility item
              return (
                <button
                  key={item.action}
                  type="button"
                  aria-label={item.ariaLabel}
                  data-tutorial={item.dataTutorial}
                  onClick={() => handleUtilityAction(item.action)}
                  className="flex-shrink-0 w-[64px] flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center text-text-muted transition-colors duration-[--duration-fast]"
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                      <GameIcon icon={item.icon} size="sm" />
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </motion.div>
                </button>
              )
            })}
          </div>

          {/* Right-edge fade gradient */}
          {showFade && (
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-[var(--color-bg-base)] to-transparent" />
          )}
        </div>
      </nav>

      <ChapterPicker
        isOpen={showChapterPicker}
        onClose={() => setShowChapterPicker(false)}
      />
    </>
  )
}
