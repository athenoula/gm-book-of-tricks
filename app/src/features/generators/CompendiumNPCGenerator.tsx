import { useState, useCallback, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices, GiHoodedFigure, GiSaveArrow } from '@/components/ui/icons'
import { FadeIn, SlideUp } from '@/components/motion'
import { rollD20 } from '@/lib/dnd'
import { useCreateNPC } from '@/features/characters/useCharacters'
import archetypeData from '@/lib/data/npc-archetypes.json'
import raceData from '@/lib/data/npc-races.json'

type Mode = 'archetype' | 'race'

const ARCHETYPE_COLUMNS = ['firstName', 'lastName', 'race', 'quirk'] as const
const RACE_COLUMNS = ['firstName', 'lastName', 'quirk'] as const

const COLUMN_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  race: 'Race',
  quirk: 'Quirk',
}

function emptySelections(mode: Mode): Record<string, number | null> {
  const cols = mode === 'archetype' ? ARCHETYPE_COLUMNS : RACE_COLUMNS
  return Object.fromEntries(cols.map((c) => [c, null]))
}

export function CompendiumNPCGenerator({ campaignId }: { campaignId: string }) {
  const [mode, setMode] = useState<Mode>('archetype')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selections, setSelections] = useState<Record<string, number | null>>(emptySelections('archetype'))
  const [rollingColumn, setRollingColumn] = useState<string | null>(null)
  const [rollDisplay, setRollDisplay] = useState(0)
  const [saved, setSaved] = useState(false)
  const rollingRef = useRef(false)

  const createNPC = useCreateNPC()
  const navigate = useNavigate()

  const columns = mode === 'archetype' ? ARCHETYPE_COLUMNS : RACE_COLUMNS

  const currentData = selectedIndex !== null
    ? mode === 'archetype'
      ? archetypeData[selectedIndex]
      : raceData[selectedIndex]
    : null

  const nextUnrolledColumn = columns.find((col) => selections[col] === null) ?? null
  const isComplete = columns.every((col) => selections[col] !== null)

  // Build the generated NPC summary
  const generatedNPC = isComplete && currentData
    ? (() => {
        const table = currentData.table
        const firstName = table[selections.firstName!].firstName
        const lastName = table[selections.lastName!].lastName
        const quirk = table[selections.quirk!].quirk
        const race = mode === 'archetype'
          ? (table[selections.race!] as { race: string }).race
          : (currentData as typeof raceData[number]).race
        const label = mode === 'archetype'
          ? (currentData as typeof archetypeData[number]).name
          : (currentData as typeof raceData[number]).race
        return { firstName, lastName, race, quirk, label }
      })()
    : null

  const animateRoll = useCallback((column: string) => {
    if (rollingRef.current) return
    rollingRef.current = true
    setRollingColumn(column)
    setRollDisplay(0)

    let count = 0
    const interval = setInterval(() => {
      setRollDisplay(Math.floor(Math.random() * 20) + 1)
      count++
      if (count > 15) {
        clearInterval(interval)
        const finalRoll = rollD20()
        setRollDisplay(finalRoll)
        setSelections((prev) => ({ ...prev, [column]: finalRoll - 1 }))
        setRollingColumn(null)
        rollingRef.current = false
      }
    }, 60)
  }, [])

  const handleRollNext = () => {
    if (nextUnrolledColumn && !rollingRef.current) {
      animateRoll(nextUnrolledColumn)
    }
  }

  const handleRollAll = () => {
    if (rollingRef.current) return
    const unrolled = columns.filter((col) => selections[col] === null)
    if (unrolled.length === 0) return

    // Stagger starts ~100ms apart
    unrolled.forEach((col, i) => {
      setTimeout(() => {
        // Each column rolls independently
        let count = 0
        if (i === 0) {
          rollingRef.current = true
        }
        setRollingColumn(col)
        const interval = setInterval(() => {
          setRollDisplay(Math.floor(Math.random() * 20) + 1)
          count++
          if (count > 15) {
            clearInterval(interval)
            const finalRoll = rollD20()
            setRollDisplay(finalRoll)
            setSelections((prev) => ({ ...prev, [col]: finalRoll - 1 }))
            // Only clear rolling state on last column
            if (i === unrolled.length - 1) {
              setRollingColumn(null)
              rollingRef.current = false
            }
          }
        }, 60)
      }, i * 100)
    })
  }

  const handleColumnClick = (column: string) => {
    if (!rollingRef.current) {
      animateRoll(column)
    }
  }

  const handleReset = () => {
    setSelections(emptySelections(mode))
    setRollingColumn(null)
    setRollDisplay(0)
    setSaved(false)
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setSelectedIndex(null)
    setSelections(emptySelections(newMode))
    setRollingColumn(null)
    setRollDisplay(0)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!generatedNPC) return
    if (mode === 'archetype') {
      const arch = archetypeData[selectedIndex!]
      await createNPC.mutateAsync({
        campaign_id: campaignId,
        name: `${arch.table[selections.firstName!].firstName} ${arch.table[selections.lastName!].lastName}`,
        race: arch.table[selections.race!].race,
        personality: arch.table[selections.quirk!].quirk,
        occupation: arch.name.replace('The ', ''),
      })
    } else {
      const raceEntry = raceData[selectedIndex!]
      await createNPC.mutateAsync({
        campaign_id: campaignId,
        name: `${raceEntry.table[selections.firstName!].firstName} ${raceEntry.table[selections.lastName!].lastName}`,
        race: raceEntry.race,
        personality: raceEntry.table[selections.quirk!].quirk,
      })
    }
    setSaved(true)
  }

  // ---- Selection screen ----
  if (selectedIndex === null) {
    return (
      <div>
        <h2 className="text-2xl font-heading flex items-center gap-2 mb-2">
          <GameIcon icon={GiHoodedFigure} size="xl" /> Compendium NPC Generator
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          Generate NPCs from the full compendium tables. Choose a mode to get started.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-bg-base rounded-[--radius-md] p-1 mb-6 w-fit border border-border">
          <button
            onClick={() => handleModeChange('archetype')}
            className={`px-4 py-2 text-sm rounded-[--radius-sm] font-medium transition-colors cursor-pointer ${
              mode === 'archetype'
                ? 'bg-primary text-text-inverse'
                : 'text-text-secondary hover:text-text-body'
            }`}
          >
            By Archetype
          </button>
          <button
            onClick={() => handleModeChange('race')}
            className={`px-4 py-2 text-sm rounded-[--radius-sm] font-medium transition-colors cursor-pointer ${
              mode === 'race'
                ? 'bg-primary text-text-inverse'
                : 'text-text-secondary hover:text-text-body'
            }`}
          >
            By Race
          </button>
        </div>

        {/* Selection grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {mode === 'archetype'
            ? archetypeData.map((arch, i) => (
                <button
                  key={arch.name}
                  onClick={() => setSelectedIndex(i)}
                  className="bg-bg-base rounded-[--radius-md] border border-border p-4 text-left hover:border-border-hover hover:bg-bg-raised transition-colors cursor-pointer"
                >
                  <h4 className="text-text-heading font-medium mb-1">{arch.name}</h4>
                  <p className="text-xs text-text-secondary">
                    {arch.table.length} entries &middot; 4 columns
                  </p>
                </button>
              ))
            : raceData.map((race, i) => (
                <button
                  key={race.race}
                  onClick={() => setSelectedIndex(i)}
                  className="bg-bg-base rounded-[--radius-md] border border-border p-4 text-left hover:border-border-hover hover:bg-bg-raised transition-colors cursor-pointer"
                >
                  <h4 className="text-text-heading font-medium mb-1">{race.race}</h4>
                  <p className="text-xs text-text-secondary">
                    {race.table.length} entries &middot; 3 columns
                  </p>
                </button>
              ))}
        </div>
      </div>
    )
  }

  // ---- Generator screen ----
  const table = currentData!.table
  const heading = mode === 'archetype'
    ? (currentData as typeof archetypeData[number]).name
    : (currentData as typeof raceData[number]).race

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading flex items-center gap-2">
            <GameIcon icon={GiHoodedFigure} size="xl" /> {heading}
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            {mode === 'archetype' ? 'Archetype' : 'Race'} mode &middot; Roll d20 for each column
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSelectedIndex(null)
            handleReset()
          }}
        >
          &larr; Back
        </Button>
      </div>

      {/* Result summary card */}
      {generatedNPC && (
        <SlideUp>
          <div className="bg-primary-ghost border border-primary/20 rounded-[--radius-lg] p-5 mb-6">
            <h3 className="text-xl font-heading text-primary-light mb-1">
              {generatedNPC.firstName} {generatedNPC.lastName}
            </h3>
            <p className="text-text-secondary">
              {mode === 'archetype'
                ? `${generatedNPC.race} ${generatedNPC.label.replace('The ', '')} \u2014 "${generatedNPC.quirk}"`
                : `${generatedNPC.race} \u2014 "${generatedNPC.quirk}"`}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {!saved ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={createNPC.isPending}>
                    <GameIcon icon={GiSaveArrow} size="sm" />
                    {createNPC.isPending ? 'Saving...' : 'Save as NPC'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleReset}>
                    New Roll
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-success">Saved!</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      navigate({
                        to: '/campaign/$campaignId/characters',
                        params: { campaignId },
                      })
                    }
                  >
                    View in Characters
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset}>
                    Roll Another
                  </Button>
                </>
              )}
            </div>
          </div>
        </SlideUp>
      )}

      {/* Roll controls */}
      {!isComplete && (
        <FadeIn>
          <div className="flex items-center gap-3 mb-6">
            {/* Roll die display */}
            <button
              onClick={handleRollNext}
              disabled={rollingRef.current || !nextUnrolledColumn}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center text-xl font-mono font-bold
                transition-all cursor-pointer shrink-0
                ${rollingColumn
                  ? 'bg-primary text-text-inverse scale-110 animate-pulse'
                  : 'bg-bg-raised border-2 border-border text-text-heading hover:border-primary hover:text-primary'
                }
              `}
            >
              {rollingColumn ? rollDisplay || '...' : <GameIcon icon={GiRollingDices} size="lg" />}
            </button>

            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRollNext}
                  disabled={rollingRef.current || !nextUnrolledColumn}
                >
                  <GameIcon icon={GiRollingDices} size="sm" />
                  Roll Next
                  {nextUnrolledColumn && (
                    <span className="text-xs opacity-75">({COLUMN_LABELS[nextUnrolledColumn]})</span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRollAll}
                  disabled={rollingRef.current || !nextUnrolledColumn}
                >
                  Roll All
                </Button>
              </div>
              {nextUnrolledColumn && (
                <p className="text-xs text-text-muted">
                  Click column headers to roll individually
                </p>
              )}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Action buttons when complete */}
      {isComplete && !generatedNPC && (
        <div className="flex gap-2 mb-6">
          <Button size="sm" variant="secondary" onClick={handleReset}>
            New Roll
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-text-muted uppercase tracking-wider py-2 px-2 w-8">
                d20
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleColumnClick(col)}
                  className={`text-left text-xs uppercase tracking-wider py-2 px-2 cursor-pointer transition-colors select-none ${
                    rollingColumn === col
                      ? 'text-primary-light'
                      : selections[col] !== null
                        ? 'text-primary/70'
                        : 'text-text-muted hover:text-text-body'
                  }`}
                  title={`Click to ${selections[col] !== null ? 're-' : ''}roll ${COLUMN_LABELS[col]}`}
                >
                  <span className="flex items-center gap-1">
                    {COLUMN_LABELS[col]}
                    {selections[col] !== null && (
                      <span className="text-[10px] text-primary font-mono">
                        [{selections[col]! + 1}]
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, index) => {
              const isAnySelected = columns.some((col) => selections[col] === index)
              return (
                <tr
                  key={index}
                  className={`border-t border-border/50 transition-colors ${
                    isAnySelected ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="py-1.5 px-2 text-xs text-text-muted font-mono">{index + 1}</td>
                  {columns.map((col) => {
                    const isSelected = selections[col] === index
                    const isRolling =
                      rollingColumn === col && rollDisplay === index + 1

                    // Get the cell value from the row
                    const value = (row as Record<string, string>)[col] ?? ''

                    return (
                      <td
                        key={col}
                        className={`
                          py-1.5 px-2 transition-all rounded-[--radius-sm]
                          ${isSelected
                            ? 'bg-primary/20 text-primary-light font-medium ring-1 ring-primary/30'
                            : isRolling
                              ? 'bg-primary/10 text-text-heading'
                              : 'text-text-secondary'
                          }
                        `}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
