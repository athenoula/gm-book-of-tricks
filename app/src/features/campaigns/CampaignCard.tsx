import { Link } from '@tanstack/react-router'
import { motion } from '@/components/motion'
import type { Campaign } from '@/lib/types'
import { GAME_SYSTEMS } from '@/lib/types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const system = GAME_SYSTEMS.find((s) => s.value === campaign.game_system)

  return (
    <Link
      to="/campaign/$campaignId"
      params={{ campaignId: campaign.id }}
      className="group block"
    >
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className="bg-bg-base rounded-[--radius-lg] border border-border p-5 hover:border-border-hover hover:bg-bg-raised transition-all duration-[--duration-normal] ornamental-corners"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg gold-foil">
            {campaign.name}
          </h3>
          <span className="text-[11px] text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm] whitespace-nowrap border border-border">
            {system?.label ?? campaign.game_system}
          </span>
        </div>

        {campaign.description && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">
            {campaign.description}
          </p>
        )}

        <p className="text-xs text-text-muted">
          Updated {formatDate(campaign.updated_at)}
        </p>
      </motion.div>
    </Link>
  )
}
