import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices, GiArcheryTarget, GiCrossedSwords } from '@/components/ui/icons'
import { rollD20 } from '@/lib/dnd'
import {
  useEncounterTables, useEncounterRows,
  useCreateEncounterTable, useDeleteEncounterTable,
  useCreateEncounterRow, useDeleteEncounterRow,
} from './useEncounterTables'
import { useAddCombatant } from '@/features/initiative/useCombatants'
import { useCampaignMonsters } from '@/features/bestiary/useMonsters'
import type { Monster } from '@/lib/types'

export function EncounterGenerator({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<'tables' | 'builder'>('tables')

  return (
    <div>
      <h3 className="text-xl mb-4 flex items-center gap-2"><GameIcon icon={GiCrossedSwords} size="xl" /> Encounter Generator</h3>
      <div className="flex gap-1 bg-bg-raised rounded-[--radius-md] p-0.5 mb-4 w-fit">
        <button
          onClick={() => setTab('tables')}
          className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'tables' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
        >
          <GameIcon icon={GiRollingDices} size="sm" /> Random Tables
        </button>
        <button
          onClick={() => setTab('builder')}
          className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'builder' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
        >
          <GameIcon icon={GiArcheryTarget} size="sm" /> Smart Builder
        </button>
      </div>

      {tab === 'tables' && <RandomTables campaignId={campaignId} />}
      {tab === 'builder' && <SmartBuilder campaignId={campaignId} />}
    </div>
  )
}

function RandomTables({ campaignId }: { campaignId: string }) {
  const { data: tables, isLoading } = useEncounterTables(campaignId)
  const createTable = useCreateEncounterTable()
  const deleteTable = useDeleteEncounterTable()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEnv, setNewEnv] = useState('')
  const [activeTableId, setActiveTableId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTable.mutateAsync({ campaign_id: campaignId, name: newName, environment: newEnv || undefined })
    setNewName('')
    setNewEnv('')
    setShowCreate(false)
  }

  if (isLoading) return <p className="text-text-muted text-sm">Loading...</p>

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Table'}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-bg-base rounded-[--radius-md] border border-border p-3 mb-3 flex gap-2 items-end">
          <Input label="Table Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Forest Encounters" required className="flex-1" />
          <Input label="Environment" value={newEnv} onChange={(e) => setNewEnv(e.target.value)} placeholder="Forest" className="w-32" />
          <Button type="submit" size="sm" disabled={createTable.isPending}>Create</Button>
        </form>
      )}

      {tables && tables.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary text-sm">No encounter tables yet. Create one to get started.</p>
        </div>
      )}

      <div className="space-y-2">
        {tables?.map((table) => (
          <div key={table.id} className="bg-bg-base rounded-[--radius-md] border border-border overflow-hidden">
            <button
              onClick={() => setActiveTableId(activeTableId === table.id ? null : table.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-raised transition-colors cursor-pointer"
            >
              <span className="text-text-heading font-medium flex-1">{table.name}</span>
              {table.environment && <span className="text-xs text-text-muted">{table.environment}</span>}
              <span className="text-xs text-text-muted">{activeTableId === table.id ? '▾' : '▸'}</span>
            </button>

            {activeTableId === table.id && (
              <div className="border-t border-border p-3">
                <EncounterTableEditor
                  tableId={table.id}
                  campaignId={campaignId}
                  onDelete={() => deleteTable.mutate({ id: table.id, campaignId })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EncounterTableEditor({ tableId, campaignId, onDelete }: { tableId: string; campaignId: string; onDelete: () => void }) {
  const { data: rows } = useEncounterRows(tableId)
  const createRow = useCreateEncounterRow()
  const deleteRow = useDeleteEncounterRow()
  const [rollResult, setRollResult] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newMin, setNewMin] = useState('')
  const [newMax, setNewMax] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const handleRoll = () => {
    const roll = rollD20()
    setRollResult(roll)
  }

  const rolledRow = rollResult && rows
    ? rows.find((r) => rollResult >= r.d20_min && rollResult <= r.d20_max)
    : null

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault()
    await createRow.mutateAsync({
      table_id: tableId,
      d20_min: parseInt(newMin, 10),
      d20_max: parseInt(newMax, 10),
      name: newName,
      description: newDesc || undefined,
    })
    setNewMin('')
    setNewMax('')
    setNewName('')
    setNewDesc('')
    setShowAdd(false)
  }

  return (
    <div>
      {/* Roll button */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={handleRoll}
          className="w-12 h-12 rounded-full bg-bg-raised border-2 border-border text-text-heading font-mono font-bold hover:border-primary hover:text-primary transition-all cursor-pointer flex items-center justify-center"
        >
          {rollResult ?? <GameIcon icon={GiRollingDices} size="lg" />}
        </button>
        {rolledRow && (
          <div className="bg-primary-ghost border border-primary/20 rounded-[--radius-md] px-3 py-2 flex-1">
            <span className="text-primary-light font-medium">{rolledRow.name}</span>
            {rolledRow.description && <p className="text-xs text-text-secondary mt-0.5">{rolledRow.description}</p>}
          </div>
        )}
        {rollResult && !rolledRow && rows && rows.length > 0 && (
          <span className="text-sm text-text-muted">No entry for {rollResult}</span>
        )}
      </div>

      {/* Table rows */}
      {rows && rows.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-text-muted py-1 w-16">Range</th>
              <th className="text-left text-xs text-text-muted py-1">Encounter</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-border/30 ${rollResult && rollResult >= row.d20_min && rollResult <= row.d20_max ? 'bg-primary/10' : ''}`}
              >
                <td className="py-1.5 font-mono text-text-muted text-xs">
                  {row.d20_min === row.d20_max ? row.d20_min : `${row.d20_min}–${row.d20_max}`}
                </td>
                <td className="py-1.5">
                  <span className="text-text-body">{row.name}</span>
                  {row.description && <span className="text-text-muted text-xs ml-2">{row.description}</span>}
                </td>
                <td>
                  <button onClick={() => deleteRow.mutate({ id: row.id, tableId })} className="text-text-muted hover:text-danger text-xs cursor-pointer">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add row form */}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setShowAdd(!showAdd)}>+ Add Row</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">Delete Table</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddRow} className="mt-2 flex gap-2 items-end">
          <Input label="Min" type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} className="w-16" required min={1} max={20} />
          <Input label="Max" type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)} className="w-16" required min={1} max={20} />
          <Input label="Encounter" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" required />
          <Input label="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="flex-1" />
          <Button type="submit" size="sm" disabled={createRow.isPending}>Add</Button>
        </form>
      )}
    </div>
  )
}

// CR difficulty thresholds per character level (from DMG)
const CR_THRESHOLDS: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
}

const CR_TO_XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
}

function SmartBuilder({ campaignId }: { campaignId: string }) {
  const { data: monsters } = useCampaignMonsters(campaignId)
  const addCombatant = useAddCombatant()
  const [partySize, setPartySize] = useState('4')
  const [partyLevel, setPartyLevel] = useState('3')
  const [selected, setSelected] = useState<{ monster: Monster; count: number }[]>([])
  const [filter, setFilter] = useState('')

  const level = Math.min(10, Math.max(1, parseInt(partyLevel, 10) || 1))
  const size = parseInt(partySize, 10) || 4
  const thresholds = CR_THRESHOLDS[level] ?? CR_THRESHOLDS[1]

  const totalXP = selected.reduce((sum, s) => {
    const xp = CR_TO_XP[s.monster.challenge_rating ?? '0'] ?? 0
    return sum + xp * s.count
  }, 0)

  const adjustedXP = totalXP * getMultiplier(selected.reduce((n, s) => n + s.count, 0))
  const partyThresholds = {
    easy: thresholds.easy * size,
    medium: thresholds.medium * size,
    hard: thresholds.hard * size,
    deadly: thresholds.deadly * size,
  }

  const difficulty =
    adjustedXP >= partyThresholds.deadly ? 'Deadly' :
    adjustedXP >= partyThresholds.hard ? 'Hard' :
    adjustedXP >= partyThresholds.medium ? 'Medium' :
    adjustedXP >= partyThresholds.easy ? 'Easy' : 'Trivial'

  const difficultyColor =
    difficulty === 'Deadly' ? 'text-danger' :
    difficulty === 'Hard' ? 'text-warning' :
    difficulty === 'Medium' ? 'text-primary-light' :
    'text-success'

  const addMonster = (monster: Monster) => {
    const existing = selected.find((s) => s.monster.id === monster.id)
    if (existing) {
      setSelected(selected.map((s) => s.monster.id === monster.id ? { ...s, count: s.count + 1 } : s))
    } else {
      setSelected([...selected, { monster, count: 1 }])
    }
  }

  const removeMonster = (monsterId: string) => {
    setSelected(selected
      .map((s) => s.monster.id === monsterId ? { ...s, count: s.count - 1 } : s)
      .filter((s) => s.count > 0)
    )
  }

  const handleStartEncounter = async () => {
    for (const s of selected) {
      for (let i = 0; i < s.count; i++) {
        const initRoll = Math.floor(Math.random() * 20) + 1
        await addCombatant.mutateAsync({
          campaign_id: campaignId,
          name: s.count > 1 ? `${s.monster.name} ${i + 1}` : s.monster.name,
          initiative: initRoll,
          hp_current: s.monster.hit_points,
          hp_max: s.monster.hit_points,
          armor_class: s.monster.armor_class,
          is_player: false,
        })
      }
    }
    setSelected([])
  }

  const filteredMonsters = monsters?.filter((m) =>
    m.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      {/* Party config */}
      <div className="flex gap-3 mb-4">
        <Input label="Party Size" type="number" value={partySize} onChange={(e) => setPartySize(e.target.value)} min={1} max={10} className="w-24" />
        <Input label="Avg Level" type="number" value={partyLevel} onChange={(e) => setPartyLevel(e.target.value)} min={1} max={10} className="w-24" />
      </div>

      {/* Difficulty meter */}
      <div className="bg-bg-base rounded-[--radius-md] border border-border p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-lg font-semibold ${difficultyColor}`}>{difficulty}</span>
          <span className="text-sm text-text-muted font-mono">{adjustedXP} XP (adjusted)</span>
        </div>
        <div className="h-2 bg-bg-raised rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              difficulty === 'Deadly' ? 'bg-danger' :
              difficulty === 'Hard' ? 'bg-warning' :
              difficulty === 'Medium' ? 'bg-primary' : 'bg-success'
            }`}
            style={{ width: `${Math.min(100, (adjustedXP / partyThresholds.deadly) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-text-muted">
          <span>Easy ({partyThresholds.easy})</span>
          <span>Medium ({partyThresholds.medium})</span>
          <span>Hard ({partyThresholds.hard})</span>
          <span>Deadly ({partyThresholds.deadly})</span>
        </div>
      </div>

      {/* Selected monsters */}
      {selected.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm text-text-muted uppercase tracking-wider">Encounter</h4>
            <Button size="sm" onClick={handleStartEncounter} disabled={addCombatant.isPending}>
              <GameIcon icon={GiCrossedSwords} size="sm" /> Start Encounter
            </Button>
          </div>
          <div className="space-y-1">
            {selected.map((s) => (
              <div key={s.monster.id} className="flex items-center gap-2 bg-bg-raised rounded-[--radius-sm] px-3 py-2">
                <span className="text-text-body text-sm flex-1">{s.monster.name}</span>
                <span className="text-xs text-text-muted">CR {s.monster.challenge_rating}</span>
                <span className="text-xs text-text-muted font-mono">×{s.count}</span>
                <span className="text-xs text-text-muted font-mono">{(CR_TO_XP[s.monster.challenge_rating ?? '0'] ?? 0) * s.count} XP</span>
                <button onClick={() => removeMonster(s.monster.id)} className="text-text-muted hover:text-danger text-xs cursor-pointer">−</button>
                <button onClick={() => addMonster(s.monster)} className="text-text-muted hover:text-success text-xs cursor-pointer">+</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monster picker */}
      <Input placeholder="Search your bestiary..." value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2" />

      {!monsters || monsters.length === 0 ? (
        <p className="text-text-muted text-sm py-4">No monsters in your bestiary. Add some from the Bestiary page first.</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filteredMonsters?.map((m) => (
            <button
              key={m.id}
              onClick={() => addMonster(m)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-[--radius-sm] hover:bg-bg-raised transition-colors cursor-pointer"
            >
              <span className="text-sm text-text-body flex-1">{m.name}</span>
              <span className="text-xs text-text-muted">{m.size} {m.type}</span>
              <span className="text-xs text-text-secondary">CR {m.challenge_rating}</span>
              <span className="text-xs text-text-muted">{CR_TO_XP[m.challenge_rating ?? '0'] ?? 0} XP</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getMultiplier(monsterCount: number): number {
  if (monsterCount <= 1) return 1
  if (monsterCount === 2) return 1.5
  if (monsterCount <= 6) return 2
  if (monsterCount <= 10) return 2.5
  if (monsterCount <= 14) return 3
  return 4
}
