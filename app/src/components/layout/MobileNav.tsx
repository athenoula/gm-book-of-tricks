import { Link, useMatches } from '@tanstack/react-router'
import { motion } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import { GiCrossedSwords, GiThreeFriends, GiScrollUnfurled, GiRollingDices } from '@/components/ui/icons'

interface NavItem {
  icon: IconComponent
  label: string
  to: string
}

const mobileNav: NavItem[] = [
  { icon: GiCrossedSwords, label: 'Overview', to: '/campaign/$campaignId' },
  { icon: GiThreeFriends, label: 'Characters', to: '/campaign/$campaignId/characters' },
  { icon: GiScrollUnfurled, label: 'Sessions', to: '/campaign/$campaignId/sessions' },
  { icon: GiRollingDices, label: 'More', to: '/campaign/$campaignId/generators' },
]

export function MobileNav({ campaignId }: { campaignId: string }) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-base/95 backdrop-blur-sm border-t border-border md:hidden">
      <div className="flex">
        {mobileNav.map((item) => {
          const resolvedTo = item.to.replace('$campaignId', campaignId)
          const isActive = currentPath === item.to

          return (
            <Link
              key={item.to}
              to={resolvedTo}
              className={`
                flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center relative
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
                  layoutId="mobile-nav-indicator"
                  className="absolute bottom-1 h-0.5 w-6 bg-primary-light rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
