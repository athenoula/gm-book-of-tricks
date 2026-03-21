import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { rollD20 } from '@/lib/dnd'
import { ARCHETYPES } from './npc-tables'
import type { Archetype } from './npc-tables'
import { useCreateNPC } from '@/features/characters/useCharacters'

interface RollResult {
  value: number
  rolling: boolean
}

export function NPCGenerator({ campaignId }: { campaignId: string }) {
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null)
  const [selections, setSelections] = useState<Record<string, number | null>>({
    firstName: null,
    lastName: null,
    race: null,
    quirk: null,
  })
  const [rollResult, setRollResult] = useState<RollResult>({ value: 0, rolling: false })
  const [currentColumn, setCurrentColumn] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const createNPC = useCreateNPC()
  const navigate = useNavigate()

  const columns = ['firstName', 'lastName', 'race', 'quirk'] as const
  const columnLabels: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    race: 'Race',
    quirk: 'Quirk',
  }

  const nextUnselectedColumn = columns.find((col) => selections[col] === null) ?? null

  const animateRoll = useCallback((column: string) => {
    setCurrentColumn(column)
    setRollResult({ value: 0, rolling: true })

    // Rapid random numbers
    let count = 0
    const interval = setInterval(() => {
      setRollResult({ value: Math.floor(Math.random() * 20) + 1, rolling: true })
      count++
      if (count > 15) {
        clearInterval(interval)
        const finalRoll = rollD20()
        setRollResult({ value: finalRoll, rolling: false })
        setSelections((prev) => ({ ...prev, [column]: finalRoll - 1 }))
        setCurrentColumn(null)
      }
    }, 60)
  }, [])

  const handleRoll = () => {
    if (nextUnselectedColumn && !rollResult.rolling) {
      animateRoll(nextUnselectedColumn)
    }
  }

  const handleCellClick = (column: string, index: number) => {
    if (!rollResult.rolling) {
      setSelections((prev) => ({ ...prev, [column]: index }))
    }
  }

  const handleReset = () => {
    setSelections({ firstName: null, lastName: null, race: null, quirk: null })
    setRollResult({ value: 0, rolling: false })
    setCurrentColumn(null)
  }

  const isComplete = columns.every((col) => selections[col] !== null)

  const generatedNPC = isComplete && selectedArchetype
    ? {
        firstName: selectedArchetype.table[selections.firstName!].firstName,
        lastName: selectedArchetype.table[selections.lastName!].lastName,
        race: selectedArchetype.table[selections.race!].race,
        quirk: selectedArchetype.table[selections.quirk!].quirk,
      }
    : null

  const handleSave = async () => {
    if (!generatedNPC) return
    await createNPC.mutateAsync({
      campaign_id: campaignId,
      name: `${generatedNPC.firstName} ${generatedNPC.lastName}`,
      race: generatedNPC.race,
      occupation: selectedArchetype?.name.replace('The ', ''),
      personality: generatedNPC.quirk,
    })
    setSaved(true)
  }

  if (!selectedArchetype) {
    return (
      <div>
        <h2 className="text-2xl flex items-center gap-2 mb-6"><GameIcon icon={GiRollingDices} size="xl" /> NPC Generator</h2>
        <p className="text-text-secondary text-sm mb-4">Choose an archetype to generate an NPC.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ARCHETYPES.map((archetype) => (
            <button
              key={archetype.name}
              onClick={() => setSelectedArchetype(archetype)}
              className="bg-bg-base rounded-[--radius-md] border border-border p-4 text-left hover:border-border-hover hover:bg-bg-raised transition-colors cursor-pointer"
            >
              <h4 className="text-text-heading font-medium mb-1">{archetype.name}</h4>
              <p className="text-xs text-text-secondary">{archetype.description}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiRollingDices} size="xl" /> NPC Generator</h2>
          <p className="text-text-secondary text-sm mt-1">{selectedArchetype.name} — {selectedArchetype.description}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setSelectedArchetype(null); handleReset() }}>
          ← Archetypes
        </Button>
      </div>

      {/* Generated NPC summary */}
      {generatedNPC && (
        <div className="bg-primary-ghost border border-primary/20 rounded-[--radius-lg] p-5 mb-6">
          <h3 className="text-xl text-primary-light mb-1">
            {generatedNPC.firstName} {generatedNPC.lastName}
          </h3>
          <p className="text-text-secondary">
            {generatedNPC.race} {selectedArchetype.name.replace('The ', '')} — "{generatedNPC.quirk}"
          </p>
          <div className="flex items-center gap-2 mt-3">
            {!saved ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={createNPC.isPending}>
                  {createNPC.isPending ? 'Saving...' : 'Save as NPC'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { handleReset(); setSaved(false) }}>
                  Roll Again
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-success">Saved!</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate({ to: '/campaign/$campaignId/characters', params: { campaignId } })}
                >
                  View in Characters
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { handleReset(); setSaved(false) }}>
                  Roll Another
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* D20 Roll button */}
      {!isComplete && (
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={handleRoll}
            disabled={rollResult.rolling || !nextUnselectedColumn}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center text-2xl font-mono font-bold
              transition-all cursor-pointer
              ${rollResult.rolling
                ? 'bg-primary text-text-inverse scale-110'
                : 'bg-bg-raised border-2 border-border text-text-heading hover:border-primary hover:text-primary'
              }
            `}
          >
            {rollResult.value || <GameIcon icon={GiRollingDices} size="lg" />}
          </button>
          {nextUnselectedColumn && (
            <p className="text-xs text-text-muted mt-2">
              Click to roll for {columnLabels[nextUnselectedColumn]}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-text-muted uppercase tracking-wider py-2 px-2 w-8">#</th>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`text-left text-xs uppercase tracking-wider py-2 px-2 ${
                    currentColumn === col ? 'text-primary-light' : 'text-text-muted'
                  }`}
                >
                  {columnLabels[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedArchetype.table.map((row, index) => (
              <tr key={index} className="border-t border-border/50">
                <td className="py-1.5 px-2 text-xs text-text-muted font-mono">{index + 1}</td>
                {columns.map((col) => {
                  const isSelected = selections[col] === index
                  const isRolling = currentColumn === col && rollResult.rolling && rollResult.value === index + 1

                  return (
                    <td
                      key={col}
                      onClick={() => handleCellClick(col, index)}
                      className={`
                        py-1.5 px-2 cursor-pointer transition-all rounded-[--radius-sm]
                        ${isSelected
                          ? 'bg-primary/20 text-primary-light font-medium'
                          : isRolling
                            ? 'bg-primary/10 text-text-heading'
                            : 'text-text-secondary hover:bg-bg-raised hover:text-text-body'
                        }
                      `}
                    >
                      {row[col]}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
