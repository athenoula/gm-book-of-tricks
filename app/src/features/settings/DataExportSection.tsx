import { useCampaigns } from '@/features/campaigns/useCampaigns'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiScrollUnfurled } from '@/components/ui/icons'
import { GAME_SYSTEMS } from '@/lib/types'
import { useExportStore } from './useExportStore'
import { exportCampaign, exportAllCampaigns } from '@/lib/export/campaign-exporter'
import { useToastStore } from '@/lib/toast'

export function DataExportSection() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { status, progress, currentStep } = useExportStore()
  const isExporting = status === 'exporting'

  const handleExportAll = () => {
    exportAllCampaigns()
  }

  const handleExportSingle = async (campaignId: string, campaignName: string) => {
    const store = useExportStore.getState()
    store.startExport()
    try {
      await exportCampaign(campaignId)
      store.finish()
      useToastStore.getState().addToast('success', `${campaignName} exported`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      store.fail(msg)
      useToastStore.getState().addToast('error', msg)
    }
  }

  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Data & Export</h2>
      <p className="text-text-muted text-sm mb-6">Download your campaign data as markdown files in a ZIP archive.</p>

      {/* Progress bar */}
      {isExporting && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>{currentStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-bg-base rounded-full border border-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Export All */}
      <div className="mb-8">
        <Button onClick={handleExportAll} disabled={isExporting || !campaigns?.length}>
          {isExporting ? 'Exporting...' : 'Export All Campaigns'}
        </Button>
      </div>

      {/* Per-campaign list */}
      <div>
        <h3 className="text-sm text-text-muted uppercase tracking-wider mb-3">Individual Campaigns</h3>
        {isLoading ? (
          <p className="text-text-muted text-sm">Loading campaigns...</p>
        ) : !campaigns?.length ? (
          <p className="text-text-muted text-sm">No campaigns found.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => {
              const system = GAME_SYSTEMS.find((s) => s.value === campaign.game_system)
              return (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-bg-base rounded-[--radius-md] border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GameIcon icon={GiScrollUnfurled} size="sm" className="text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-body truncate">{campaign.name}</p>
                      <p className="text-xs text-text-muted">{system?.label ?? campaign.game_system}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExportSingle(campaign.id, campaign.name)}
                    disabled={isExporting}
                  >
                    Export
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
