import { useState } from 'react'
import { Link, useMatches } from '@tanstack/react-router'
import { create } from 'zustand'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiCrossedSwords, GiThreeFriends, GiSpikedDragonHead, GiSparkles,
  GiPositionMarker, GiRollingDices, GiNotebook, GiScrollUnfurled, GiCastle,
  GiOpenBook, GiChatBubble, GiBugNet, GiSun, GiMoonBats,
} from '@/components/ui/icons'
import { useTheme } from '@/lib/theme'
import { ChapterPicker } from '@/features/tutorial/ChapterPicker'

interface SidebarState {
  expanded: boolean
  toggle: () => void
}

export const useSidebar = create<SidebarState>((set) => ({
  expanded: false,
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}))

interface NavItem {
  icon: IconComponent
  label: string
  to: string
  tutorialId?: string
}

const campaignNav: NavItem[] = [
  { icon: GiCrossedSwords, label: 'Overview', to: '/campaign/$campaignId' },
  { icon: GiScrollUnfurled, label: 'Sessions', to: '/campaign/$campaignId/sessions' },
  { icon: GiThreeFriends, label: 'Characters', to: '/campaign/$campaignId/characters', tutorialId: 'nav-characters' },
  { icon: GiSpikedDragonHead, label: 'Bestiary', to: '/campaign/$campaignId/bestiary', tutorialId: 'nav-bestiary' },
  { icon: GiSparkles, label: 'Spellbook', to: '/campaign/$campaignId/spellbook' },
  { icon: GiPositionMarker, label: 'Locations', to: '/campaign/$campaignId/locations', tutorialId: 'nav-locations' },
  { icon: GiRollingDices, label: 'Generators', to: '/campaign/$campaignId/generators' },
  { icon: GiNotebook, label: 'Scratchpad', to: '/campaign/$campaignId/scratchpad', tutorialId: 'nav-scratchpad' },
]

const betaNav: NavItem[] = [
  { icon: GiChatBubble, label: 'Give Feedback', to: '/feedback' },
  { icon: GiBugNet, label: 'Report Bug / Idea', to: '/report' },
]

export function Sidebar({ campaignId }: { campaignId: string }) {
  const { expanded, toggle } = useSidebar()
  const matches = useMatches()
  const resolved = useTheme((s) => s.resolved)
  const toggleTheme = useTheme((s) => s.toggle)
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''
  const [showChapterPicker, setShowChapterPicker] = useState(false)

  return (
    <>
    <aside
      data-tutorial="sidebar"
      className={`
        fixed left-0 top-0 bottom-0 z-40
        bg-bg-base border-r border-border
        flex flex-col
        transition-all duration-[--duration-slow] ease-[--ease-out]
        ${expanded ? 'w-[--sidebar-width-expanded]' : 'w-[--sidebar-width]'}
        max-md:hidden
      `}
    >
      {/* Logo / collapse toggle */}
      <button
        onClick={toggle}
        className="h-14 flex items-center justify-center border-b border-border hover:bg-bg-raised transition-colors cursor-pointer"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="text-lg" role="img" aria-hidden="true">
          {expanded ? '◁' : '☰'}
        </span>
      </button>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {campaignNav.map((item) => {
          const resolvedTo = item.to.replace('$campaignId', campaignId)
          const isActive = currentPath === item.to

          return (
            <Link
              key={item.to}
              to={resolvedTo}
              className={`
                flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
                transition-colors duration-[--duration-fast]
                ${expanded ? 'px-3' : 'justify-center'}
                ${isActive
                  ? 'bg-primary-ghost text-primary-light'
                  : 'text-text-muted hover:text-text-body hover:bg-bg-raised'
                }
              `}
              data-tutorial={item.tutorialId}
              title={expanded ? undefined : item.label}
            >
              <GameIcon icon={item.icon} size="base" />
              {expanded && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Beta section */}
      <div className="px-2 pb-2">
        <div className={`text-[10px] uppercase tracking-wider text-text-muted mb-1 ${expanded ? 'px-3' : 'text-center'}`}>
          {expanded ? 'Beta' : '·'}
        </div>
        {betaNav.map((item) => {
          const isActive = currentPath === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`
                flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
                transition-colors duration-[--duration-fast]
                ${expanded ? 'px-3' : 'justify-center'}
                ${isActive
                  ? 'bg-primary-ghost text-primary-light'
                  : 'text-text-muted hover:text-text-body hover:bg-bg-raised'
                }
              `}
              title={expanded ? undefined : item.label}
            >
              <GameIcon icon={item.icon} size="base" />
              {expanded && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border">
        <button
          onClick={toggleTheme}
          className={`
            flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
            text-text-muted hover:text-text-body hover:bg-bg-raised
            transition-colors duration-[--duration-fast] cursor-pointer
            ${expanded ? 'px-3' : 'justify-center'}
          `}
          title={expanded ? undefined : (resolved === 'dark' ? 'Light mode' : 'Dark mode')}
        >
          <GameIcon icon={resolved === 'dark' ? GiSun : GiMoonBats} size="base" />
          {expanded && <span className="text-sm font-medium">{resolved === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={() => setShowChapterPicker(true)}
          className={`
            flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
            text-text-muted hover:text-text-body hover:bg-bg-raised
            transition-colors duration-[--duration-fast] cursor-pointer
            ${expanded ? 'px-3' : 'justify-center'}
          `}
          title={expanded ? undefined : 'Take the tour'}
        >
          <GameIcon icon={GiOpenBook} size="base" />
          {expanded && <span className="text-sm font-medium">Take the Tour</span>}
        </button>
        <Link
          to="/home"
          data-tutorial="all-campaigns"
          className={`
            flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
            text-text-muted hover:text-text-body hover:bg-bg-raised
            transition-colors duration-[--duration-fast]
            ${expanded ? 'px-3' : 'justify-center'}
          `}
          title={expanded ? undefined : 'All campaigns'}
        >
          <GameIcon icon={GiCastle} size="base" />
          {expanded && <span className="text-sm font-medium">All Campaigns</span>}
        </Link>
      </div>
    </aside>
    <ChapterPicker isOpen={showChapterPicker} onClose={() => setShowChapterPicker(false)} />
    </>
  )
}
