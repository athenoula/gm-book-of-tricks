import { useState } from 'react'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { CompendiumNPCGenerator } from './CompendiumNPCGenerator'
import { CompendiumEncounterGenerator } from './CompendiumEncounterGenerator'
import { LootTableManager } from './LootTableManager'

export function GeneratorsPage({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<'npc' | 'encounter' | 'loot'>('npc')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiRollingDices} size="xl" /> Generators</h2>
        <div className="flex gap-1 bg-bg-raised rounded-[--radius-md] p-0.5">
          <button
            onClick={() => setTab('npc')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'npc' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            NPC
          </button>
          <button
            onClick={() => setTab('encounter')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'encounter' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            Encounter
          </button>
          <button
            onClick={() => setTab('loot')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'loot' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            Loot
          </button>
        </div>
      </div>

      {tab === 'npc' && <CompendiumNPCGenerator campaignId={campaignId} />}
      {tab === 'encounter' && <CompendiumEncounterGenerator campaignId={campaignId} />}
      {tab === 'loot' && <LootTableManager campaignId={campaignId} />}
    </div>
  )
}
