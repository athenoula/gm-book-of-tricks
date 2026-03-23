import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiSpikedDragonHead, GiHoodedFigure } from '@/components/ui/icons'
import { StaggerList, StaggerItem } from '@/components/motion'
import { useCampaignMonsters, useSearchSrdMonsters, useSaveMonster, useDeleteMonster } from './useMonsters'
import { MonsterCreateForm } from './MonsterCreateForm'
import { MonsterToNPCDialog } from './MonsterToNPCDialog'
import { useCampaign } from '@/features/campaigns/useCampaigns'
import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { Monster } from '@/lib/types'
import type { Open5eMonster } from '@/lib/open5e'

export function BestiaryPage({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<'library' | 'search'>('library')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiSpikedDragonHead} size="xl" /> Bestiary</h2>
        <div className="flex gap-1 bg-bg-raised rounded-[--radius-md] p-0.5">
          <button
            onClick={() => setTab('library')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'library' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            Library
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'search' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            SRD Search
          </button>
        </div>
      </div>

      {tab === 'library' && <MonsterLibrary campaignId={campaignId} />}
      {tab === 'search' && <SrdMonsterSearch campaignId={campaignId} />}
    </div>
  )
}

function MonsterLibrary({ campaignId }: { campaignId: string }) {
  const { data: monsters, isLoading, error } = useCampaignMonsters(campaignId)
  const deleteMonster = useDeleteMonster()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [sourceBookFilter, setSourceBookFilter] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMonster, setEditingMonster] = useState<Monster | null>(null)
  const [makeNPCMonster, setMakeNPCMonster] = useState<Monster | null>(null)

  const sourceBooks = [...new Set(monsters?.map(m => m.source_book).filter(Boolean) ?? [])].sort()

  const filtered = monsters?.filter((m) =>
    m.name.toLowerCase().includes(filter.toLowerCase())
  ).filter((m) =>
    !sourceBookFilter || m.source_book === sourceBookFilter
  )

  if (showCreateForm || editingMonster) {
    return (
      <MonsterCreateForm
        campaignId={campaignId}
        monster={editingMonster ?? undefined}
        onClose={() => { setShowCreateForm(false); setEditingMonster(null) }}
      />
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Filter monsters..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1"
        />
        <select
          value={sourceBookFilter}
          onChange={(e) => setSourceBookFilter(e.target.value)}
          className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm"
        >
          <option value="">All Sources</option>
          {sourceBooks.map((sb) => (
            <option key={sb} value={sb!}>
              {sb === 'Systems Reference Document' ? 'SRD' : sb}
            </option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
          <GiSpikedDragonHead className="inline" size={16} /> Create Monster
        </Button>
      </div>

      {isLoading && <p className="text-text-muted text-sm py-4">Loading monsters...</p>}

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-[--radius-md] p-4 text-center">
          <p className="text-danger text-sm">{error.message || 'Something went wrong'}</p>
          <p className="text-text-muted text-xs mt-1">Try refreshing the page</p>
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary text-sm">No monsters yet. Search the SRD to add some.</p>
        </div>
      )}

      <StaggerList className="space-y-2">
        {filtered?.map((monster) => (
          <StaggerItem key={monster.id}>
            <MonsterCard
              monster={monster}
              expanded={expandedId === monster.id}
              onToggle={() => setExpandedId(expandedId === monster.id ? null : monster.id)}
              onDelete={() => deleteMonster.mutate({ id: monster.id, campaignId })}
              onEdit={() => setEditingMonster(monster)}
              onMakeNPC={() => setMakeNPCMonster(monster)}
            />
          </StaggerItem>
        ))}
      </StaggerList>

      {makeNPCMonster && (
        <MonsterToNPCDialog
          monster={makeNPCMonster}
          campaignId={campaignId}
          onClose={() => setMakeNPCMonster(null)}
        />
      )}
    </div>
  )
}

function MonsterCard({ monster, expanded, onToggle, onDelete, onEdit, onMakeNPC }: {
  monster: Monster
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  onMakeNPC: () => void
}) {
  const sb = monster.stat_block as Open5eMonster | null

  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-raised transition-colors cursor-pointer"
      >
        <span className="text-text-heading font-medium flex-1">{monster.name}</span>
        {monster.source_book && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-700/50 text-stone-400">
            {monster.source_book === 'Systems Reference Document' ? 'SRD' : monster.source_book}
          </span>
        )}
        <span className="text-xs text-text-muted">{monster.size} {monster.type}</span>
        <span className="text-xs text-text-secondary">CR {monster.challenge_rating}</span>
        <div className="flex gap-2 text-xs text-text-muted">
          <span>AC {monster.armor_class}</span>
          <span>HP {monster.hit_points}</span>
        </div>
        <span className="text-xs text-text-muted">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && sb && (
        <div className="px-3 pb-3 border-t border-border pt-3 space-y-3 text-sm">
          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-2 text-center">
            {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map((ability) => (
              <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-2">
                <div className="text-[10px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
                <div className="text-text-heading font-mono text-sm">{sb[ability]}</div>
                <div className="text-xs text-text-secondary">{formatModifier(abilityModifier(sb[ability]))}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="space-y-1 text-xs text-text-secondary">
            {sb.armor_desc && <div><span className="text-text-muted">Armor:</span> {sb.armor_desc}</div>}
            <div><span className="text-text-muted">Hit Dice:</span> {sb.hit_dice}</div>
            <div><span className="text-text-muted">Speed:</span> {Object.entries(sb.speed).map(([k, v]) => `${k} ${v}ft`).join(', ')}</div>
            {sb.senses && <div><span className="text-text-muted">Senses:</span> {sb.senses}</div>}
            {sb.languages && <div><span className="text-text-muted">Languages:</span> {sb.languages}</div>}
          </div>

          {/* Special abilities */}
          {sb.special_abilities?.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wider mb-1">Special Abilities</h5>
              {sb.special_abilities.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          {sb.actions?.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wider mb-1">Actions</h5>
              {sb.actions.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}

          {/* Legendary */}
          {sb.legendary_actions?.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wider mb-1">Legendary Actions</h5>
              {sb.legendary_desc && <p className="text-xs text-text-secondary mb-1">{sb.legendary_desc}</p>}
              {sb.legendary_actions.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={onMakeNPC}>
              <GameIcon icon={GiHoodedFigure} size="sm" /> Make NPC
            </Button>
            {monster.source === 'homebrew' && (
              <Button size="sm" variant="ghost" onClick={onEdit}>
                Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SrdMonsterSearch({ campaignId }: { campaignId: string }) {
  const [search, setSearch] = useState('')
  const [includeOtherEdition, setIncludeOtherEdition] = useState(false)
  const saveMonster = useSaveMonster()
  const { data: campaign } = useCampaign(campaignId)

  const { data, isLoading } = useSearchSrdMonsters({
    search,
    edition: campaign?.game_system,
    includeOtherEdition,
  })

  return (
    <div>
      <Input
        placeholder="Search monsters (e.g. dragon, goblin)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />
      <label className="flex items-center gap-2 text-sm text-stone-400 mb-4">
        <input
          type="checkbox"
          checked={includeOtherEdition}
          onChange={e => setIncludeOtherEdition(e.target.checked)}
          className="rounded border-stone-600"
        />
        Include other edition results
      </label>

      {isLoading && <p className="text-text-muted text-sm py-4">Searching...</p>}

      {data && data.results.length === 0 && (
        <p className="text-text-secondary text-sm py-4">No monsters found.</p>
      )}

      {data && (
        <div className="space-y-1">
          {data.results.map((m) => (
            <div key={m.slug} className="flex items-center gap-3 bg-bg-base rounded-[--radius-md] border border-border p-3">
              <div className="flex-1 min-w-0">
                <span className="text-text-heading font-medium">{m.name}</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  {m.size} {m.type} · CR {m.challenge_rating} · AC {m.armor_class} · HP {m.hit_points}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => saveMonster.mutate({ srdMonster: m, campaignId })}
                disabled={saveMonster.isPending}
              >
                Save
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
