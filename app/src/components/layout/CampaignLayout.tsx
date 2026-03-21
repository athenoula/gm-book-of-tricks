import type { ReactNode } from 'react'
import { Sidebar, useSidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

interface CampaignLayoutProps {
  campaignId: string
  children: ReactNode
}

export function CampaignLayout({ campaignId, children }: CampaignLayoutProps) {
  const expanded = useSidebar((s) => s.expanded)

  return (
    <div className="min-h-dvh">
      <Sidebar campaignId={campaignId} />
      <main
        className={`
          transition-all duration-[--duration-slow] ease-[--ease-out]
          min-h-dvh
          max-md:ml-0 max-md:pb-16
          ${expanded ? 'md:ml-[--sidebar-width-expanded]' : 'md:ml-[--sidebar-width]'}
        `}
      >
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <MobileNav campaignId={campaignId} />
    </div>
  )
}
