import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCampaignSpells } from '@/features/spellbook/useSpells'
import { usePCSpells, useAssignSpell, useUnassignSpell, useTogglePrepared } from './useCharacterSpells'

export function SpellPicker({ pcId, campaignId }: { pcId: string; campaignId: string }) {
  const { data: pcSpells, isLoading: loadingAssigned } = usePCSpells(pcId)
  const { data: campaignSpells } = useCampaignSpells(campaignId)
  const assignSpell = useAssignSpell()
  const unassignSpell = useUnassignSpell()
  const togglePrepared = useTogglePrepared()
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const assignedIds = new Set(pcSpells?.map((ps) => ps.spell_id) ?? [])

  const availableSpells = campaignSpells
    ?.filter((s) => !assignedIds.has(s.id))
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  // Group assigned spells by level
  const groupedSpells = pcSpells?.reduce<Record<number, typeof pcSpells>>((acc, ps) => {
    const lvl = ps.spell.level
    if (!acc[lvl]) acc[lvl] = []
    acc[lvl].push(ps)
    return acc
  }, {})

  if (loadingAssigned) {
    return <p className="text-text-muted text-sm">Loading spells...</p>
  }

  return (
    <div className="space-y-3">
      {/* Assigned spells */}
      {pcSpells && pcSpells.length > 0 ? (
        <div className="space-y-3">
          {Object.entries(groupedSpells ?? {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, spells]) => (
              <div key={level}>
                <h5 className="text-xs text-text-muted uppercase tracking-wider mb-1">
                  {Number(level) === 0 ? 'Cantrips' : `Level ${level}`}
                </h5>
                <div className="space-y-1">
                  {spells.map((ps) => (
                    <div key={ps.id} className="flex items-center gap-2 bg-bg-raised rounded-[--radius-sm] px-2.5 py-1.5">
                      <button
                        onClick={() => togglePrepared.mutate({ id: ps.id, isPrepared: !ps.is_prepared, pcId })}
                        className={`w-4 h-4 rounded-sm border cursor-pointer flex-shrink-0 flex items-center justify-center text-[10px] ${
                          ps.is_prepared
                            ? 'bg-primary border-primary text-text-inverse'
                            : 'border-border hover:border-border-hover'
                        }`}
                        title={ps.is_prepared ? 'Prepared' : 'Not prepared'}
                      >
                        {ps.is_prepared && '✓'}
                      </button>
                      <span className="text-sm text-text-body flex-1">{ps.spell.name}</span>
                      <span className="text-[10px] text-text-muted">{ps.spell.school}</span>
                      {ps.spell.concentration && (
                        <span className="text-[9px] text-info bg-info/10 px-1 rounded">C</span>
                      )}
                      <button
                        onClick={() => unassignSpell.mutate({ id: ps.id, pcId })}
                        className="text-text-muted hover:text-danger text-xs cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No spells assigned yet.</p>
      )}

      {/* Add spells button / picker */}
      <Button size="sm" variant="secondary" onClick={() => setShowPicker(!showPicker)}>
        {showPicker ? 'Close' : '+ Add Spells'}
      </Button>

      {showPicker && (
        <div className="border border-border rounded-[--radius-md] p-3 space-y-2">
          <Input
            placeholder="Search campaign spells..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {!campaignSpells || campaignSpells.length === 0 ? (
            <p className="text-xs text-text-muted py-2">
              No spells in campaign library. Add some from the Spellbook first.
            </p>
          ) : availableSpells && availableSpells.length === 0 ? (
            <p className="text-xs text-text-muted py-2">
              {search ? 'No matching spells.' : 'All campaign spells are already assigned.'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {availableSpells?.map((spell) => (
                <button
                  key={spell.id}
                  onClick={() => assignSpell.mutate({ pcId, spellId: spell.id })}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-[--radius-sm] hover:bg-bg-raised transition-colors cursor-pointer"
                  disabled={assignSpell.isPending}
                >
                  <span className="text-sm text-text-body flex-1">{spell.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                  </span>
                  <span className="text-[10px] text-text-muted">{spell.school}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
