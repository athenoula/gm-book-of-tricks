import { Link, useMatches } from '@tanstack/react-router'
import { create } from 'zustand'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiCrossedSwords, GiThreeFriends, GiSpikedDragonHead, GiSparkles,
  GiPositionMarker, GiRollingDices, GiNotebook, GiScrollUnfurled, GiCastle,
} from '@/components/ui/icons'

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
}

const campaignNav: NavItem[] = [
  { icon: GiCrossedSwords, label: 'Overview', to: '/campaign/$campaignId' },
  { icon: GiScrollUnfurled, label: 'Sessions', to: '/campaign/$campaignId/sessions' },
  { icon: GiThreeFriends, label: 'Characters', to: '/campaign/$campaignId/characters' },
  { icon: GiSpikedDragonHead, label: 'Bestiary', to: '/campaign/$campaignId/bestiary' },
  { icon: GiSparkles, label: 'Spellbook', to: '/campaign/$campaignId/spellbook' },
  { icon: GiPositionMarker, label: 'Locations', to: '/campaign/$campaignId/locations' },
  { icon: GiRollingDices, label: 'Generators', to: '/campaign/$campaignId/generators' },
  { icon: GiNotebook, label: 'Scratchpad', to: '/campaign/$campaignId/scratchpad' },
]

export function Sidebar({ campaignId }: { campaignId: string }) {
  const { expanded, toggle } = useSidebar()
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''

  return (
    <aside
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

      {/* Bottom actions */}
      <div className="p-2 border-t border-border">
        <Link
          to="/home"
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
  )
}
