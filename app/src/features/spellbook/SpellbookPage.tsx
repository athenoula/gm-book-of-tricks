import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiSparkles } from '@/components/ui/icons'
import { Input } from '@/components/ui/Input'
import { StaggerList, StaggerItem } from '@/components/motion'
import { SPELL_SCHOOLS, SPELL_CLASSES } from '@/lib/types'
import type { Open5eSpell } from '@/lib/open5e'
import { useCampaignSpells, useSearchSrdSpells, useSaveSpell, useBulkImportSpells, useDeleteSpell } from './useSpells'
import type { Spell } from '@/lib/types'

export function SpellbookPage({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<'library' | 'search'>('library')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiSparkles} size="xl" /> Spellbook</h2>
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

      {tab === 'library' && <SpellLibrary campaignId={campaignId} />}
      {tab === 'search' && <SrdSpellSearch campaignId={campaignId} />}
    </div>
  )
}

function SpellLibrary({ campaignId }: { campaignId: string }) {
  const { data: spells, isLoading } = useCampaignSpells(campaignId)
  const deleteSpell = useDeleteSpell()
  const bulkImport = useBulkImportSpells()
  const [filter, setFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<string | null>(null)

  const filtered = spells?.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  )

  const handleBulkImport = async () => {
    setImportProgress('Starting...')
    await bulkImport.mutateAsync({
      campaignId,
      onProgress: (loaded, total, phase) => {
        setImportProgress(`${phase} ${loaded}/${total}`)
      },
    })
    setImportProgress(null)
  }

  const groupedByLevel = filtered?.reduce<Record<number, Spell[]>>((acc, spell) => {
    const lvl = spell.level
    if (!acc[lvl]) acc[lvl] = []
    acc[lvl].push(spell)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Filter spells..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleBulkImport}
          disabled={bulkImport.isPending}
        >
          {importProgress ?? 'Import All SRD'}
        </Button>
      </div>

      {isLoading && <p className="text-text-muted text-sm py-4">Loading spells...</p>}

      {filtered && filtered.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary text-sm">No spells yet. Search the SRD or import all.</p>
        </div>
      )}

      {groupedByLevel && Object.entries(groupedByLevel)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([level, spells]) => (
          <div key={level} className="mb-4">
            <h4 className="text-sm text-text-muted uppercase tracking-wider mb-2">
              {Number(level) === 0 ? 'Cantrips' : `Level ${level}`}
            </h4>
            <StaggerList className="space-y-1">
              {spells.map((spell) => (
                <StaggerItem key={spell.id}>
                  <SpellCard
                    spell={spell}
                    expanded={expandedId === spell.id}
                    onToggle={() => setExpandedId(expandedId === spell.id ? null : spell.id)}
                    onDelete={() => deleteSpell.mutate({ id: spell.id, campaignId })}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        ))}
    </div>
  )
}

function SpellCard({ spell, expanded, onToggle, onDelete }: {
  spell: Spell
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const data = spell.spell_data as Open5eSpell | null

  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-raised transition-colors cursor-pointer"
      >
        <span className="text-text-heading font-medium flex-1">{spell.name}</span>
        <span className="text-xs text-text-muted">{spell.school}</span>
        {spell.concentration && (
          <span className="text-[10px] text-info bg-info/10 px-1.5 py-0.5 rounded-[--radius-sm]">C</span>
        )}
        {spell.ritual && (
          <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-[--radius-sm]">R</span>
        )}
        <span className="text-xs text-text-muted">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && data && (
        <div className="px-3 pb-3 border-t border-border pt-3 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
            <div><span className="text-text-muted">Casting Time:</span> {data.casting_time}</div>
            <div><span className="text-text-muted">Range:</span> {data.range}</div>
            <div><span className="text-text-muted">Duration:</span> {data.duration}</div>
            <div><span className="text-text-muted">Components:</span> {spell.components}</div>
          </div>
          <p className="text-text-body text-sm whitespace-pre-line">{data.desc}</p>
          {data.higher_level && (
            <p className="text-text-secondary text-sm">
              <span className="text-text-muted font-medium">At Higher Levels:</span> {data.higher_level}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-muted">{data.dnd_class}</span>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SrdSpellSearch({ campaignId }: { campaignId: string }) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<string>('')
  const [school, setSchool] = useState('')
  const [dndClass, setDndClass] = useState('')
  const saveSpell = useSaveSpell()

  const { data, isLoading } = useSearchSrdSpells({
    search: search || undefined,
    level: level !== '' ? Number(level) : undefined,
    school: school || undefined,
    dnd_class: dndClass || undefined,
    enabled: !!(search || level !== '' || school || dndClass),
  })

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Input
          placeholder="Search spells..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm"
        >
          <option value="">Any level</option>
          <option value="0">Cantrip</option>
          {[1,2,3,4,5,6,7,8,9].map((l) => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>
        <select
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm"
        >
          <option value="">Any school</option>
          {SPELL_SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={dndClass}
          onChange={(e) => setDndClass(e.target.value)}
          className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm"
        >
          <option value="">Any class</option>
          {SPELL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-text-muted text-sm py-4">Searching...</p>}

      {data && data.results.length === 0 && (
        <p className="text-text-secondary text-sm py-4">No spells found.</p>
      )}

      {data && (
        <div className="space-y-1">
          {data.results.map((spell) => (
            <div
              key={spell.slug}
              className="flex items-center gap-3 bg-bg-base rounded-[--radius-md] border border-border p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-text-heading font-medium">{spell.name}</span>
                  <span className="text-xs text-text-muted">
                    {spell.level_int === 0 ? 'Cantrip' : `Lvl ${spell.level_int}`}
                  </span>
                  <span className="text-xs text-text-muted">{spell.school}</span>
                </div>
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {spell.casting_time} · {spell.range} · {spell.duration}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => saveSpell.mutate({ srdSpell: spell, campaignId })}
                disabled={saveSpell.isPending}
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
