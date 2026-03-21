import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import {
  GiRollingDices,
  GiForestCamp,
  GiCastle,
  GiDungeonGate,
  GiTrail,
  GiWaveCrest,
  GiMountainRoad,
  GiNotebook,
  GiBookmark,
} from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'
import { FadeIn, SlideUp } from '@/components/motion'
import { rollD20 } from '@/lib/dnd'
import encounterData from '@/lib/data/encounter-tables.json'
import { useCreateInspiration } from '@/features/scratchpad/useInspiration'
import { useSessions } from '@/features/sessions/useSessions'
import { useAddTimelineBlock } from '@/features/timeline/useTimelineBlocks'

const TABLE_KEYS = ['whoWhat', 'disposition', 'complication', 'reward', 'consequence'] as const
type TableKey = (typeof TABLE_KEYS)[number]

const TABLE_LABELS: Record<TableKey, string> = {
  whoWhat: 'Who/What',
  disposition: 'Disposition',
  complication: 'Complication',
  reward: 'Reward',
  consequence: 'Consequence',
}

const LOCATION_ICONS: Record<string, IconComponent> = {
  Forest: GiForestCamp,
  'City Streets': GiCastle,
  Dungeon: GiDungeonGate,
  'Road/Wilderness': GiTrail,
  'Coastal/Sea': GiWaveCrest,
  Mountain: GiMountainRoad,
}

function emptySelections(): Record<TableKey, number | null> {
  return { whoWhat: null, disposition: null, complication: null, reward: null, consequence: null }
}

export function CompendiumEncounterGenerator({ campaignId }: { campaignId: string }) {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [selections, setSelections] = useState<Record<TableKey, number | null>>(emptySelections())
  const [rollingColumn, setRollingColumn] = useState<string | null>(null)
  const [rollDisplay, setRollDisplay] = useState(0)
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  const [showSessionPicker, setShowSessionPicker] = useState(false)
  const [savedToScratchpad, setSavedToScratchpad] = useState(false)
  const rollingRef = useRef(false)

  const createInspiration = useCreateInspiration()
  const { data: sessions } = useSessions(campaignId)
  const addTimelineBlock = useAddTimelineBlock()

  const locationData = selectedLocation !== null ? encounterData[selectedLocation] : null
  const isComplete = TABLE_KEYS.every((key) => selections[key] !== null)
  const nextUnrolledKey = TABLE_KEYS.find((key) => selections[key] === null) ?? null

  const toggleTable = (key: string) => {
    setExpandedTables((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const animateRoll = useCallback((column: TableKey) => {
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
        // Collapse after rolling
        setExpandedTables((prev) => ({ ...prev, [column]: false }))
      }
    }, 60)
  }, [])

  const handleRollNext = () => {
    if (nextUnrolledKey && !rollingRef.current) {
      animateRoll(nextUnrolledKey)
    }
  }

  const handleRollAll = () => {
    if (rollingRef.current) return
    const unrolled = TABLE_KEYS.filter((key) => selections[key] === null)
    if (unrolled.length === 0) return

    unrolled.forEach((key, i) => {
      setTimeout(() => {
        let count = 0
        if (i === 0) {
          rollingRef.current = true
        }
        setRollingColumn(key)
        const interval = setInterval(() => {
          setRollDisplay(Math.floor(Math.random() * 20) + 1)
          count++
          if (count > 15) {
            clearInterval(interval)
            const finalRoll = rollD20()
            setRollDisplay(finalRoll)
            setSelections((prev) => ({ ...prev, [key]: finalRoll - 1 }))
            // Collapse after rolling
            setExpandedTables((prev) => ({ ...prev, [key]: false }))
            if (i === unrolled.length - 1) {
              setRollingColumn(null)
              rollingRef.current = false
            }
          }
        }, 60)
      }, i * 100)
    })
  }

  const handleColumnClick = (key: TableKey) => {
    if (!rollingRef.current) {
      animateRoll(key)
    }
  }

  const buildEncounterText = () => {
    if (!locationData) return ''
    const tables = locationData.tables as Record<string, string[]>
    return TABLE_KEYS.map((key) => {
      const value = selections[key] !== null ? tables[key][selections[key]!] : ''
      return `**${TABLE_LABELS[key]}:** ${value}`
    }).join('\n')
  }

  const buildEncounterTitle = () => {
    if (!locationData || selections.whoWhat === null) return 'Random Encounter'
    const tables = locationData.tables as Record<string, string[]>
    return `${locationData.location}: ${tables.whoWhat[selections.whoWhat!]}`
  }

  const handleSaveToScratchpad = () => {
    createInspiration.mutate({
      title: buildEncounterTitle(),
      content: buildEncounterText(),
      type: 'text',
      tags: ['encounter', locationData?.location.toLowerCase() ?? ''],
      campaign_id: campaignId,
    })
    setSavedToScratchpad(true)
  }

  const handleAddToSession = async (sessionId: string) => {
    const snapshot = {
      location: locationData?.location,
      entries: TABLE_KEYS.reduce((acc, key) => {
        const tables = locationData!.tables as Record<string, string[]>
        acc[key] = selections[key] !== null ? tables[key][selections[key]!] : ''
        return acc
      }, {} as Record<string, string>),
      text: buildEncounterText(),
    }
    addTimelineBlock.mutate({
      session_id: sessionId,
      campaign_id: campaignId,
      block_type: 'note',
      title: buildEncounterTitle(),
      content_snapshot: snapshot,
      sort_order: Date.now(),
    })
    setShowSessionPicker(false)
  }

  const handleReset = () => {
    setSelections(emptySelections())
    setRollingColumn(null)
    setRollDisplay(0)
    setExpandedTables({})
    setSavedToScratchpad(false)
    setShowSessionPicker(false)
  }

  const handleBackToLocations = () => {
    setSelectedLocation(null)
    handleReset()
  }

  // ---- Location selection screen ----
  if (selectedLocation === null) {
    return (
      <div>
        <h2 className="text-2xl font-heading flex items-center gap-2 mb-2">
          <GameIcon icon={GiRollingDices} size="xl" /> Encounter Generator
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          Generate random encounters from location-based tables. Pick a location to begin.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {encounterData.map((loc, i) => {
            const Icon = LOCATION_ICONS[loc.location] ?? GiRollingDices
            return (
              <button
                key={loc.location}
                onClick={() => setSelectedLocation(i)}
                className="bg-bg-base rounded-[--radius-md] border border-border p-5 text-left hover:border-border-hover hover:bg-bg-raised transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <GameIcon icon={Icon} size="lg" />
                  </div>
                  <h4 className="text-text-heading font-heading text-lg">{loc.location}</h4>
                </div>
                <p className="text-xs text-text-secondary">
                  5 sub-tables &middot; 20 entries each
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- Generator screen ----
  const location = locationData!
  const LocationIcon = LOCATION_ICONS[location.location] ?? GiRollingDices

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading flex items-center gap-2">
            <GameIcon icon={LocationIcon} size="xl" /> {location.location}
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Roll d20 for each sub-table to build an encounter
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleBackToLocations}>
          &larr; Locations
        </Button>
      </div>

      {/* Result summary card */}
      {isComplete && (
        <SlideUp>
          <div className="bg-primary-ghost border border-primary/20 rounded-[--radius-lg] p-5 mb-6">
            <h3 className="text-lg font-heading text-primary-light mb-3">
              Encounter Summary
            </h3>
            <dl className="space-y-2">
              {TABLE_KEYS.map((key) => {
                const tables = location.tables as Record<string, string[]>
                const value = tables[key][selections[key]!]
                return (
                  <div key={key} className="flex gap-2">
                    <dt className="text-text-muted text-sm font-medium shrink-0 w-28">
                      {TABLE_LABELS[key]}:
                    </dt>
                    <dd className="text-text-heading text-sm">{value}</dd>
                  </div>
                )
              })}
            </dl>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button size="sm" variant="secondary" onClick={handleReset}>
                New Encounter
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBackToLocations}>
                Change Location
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                size="sm"
                onClick={handleSaveToScratchpad}
                disabled={savedToScratchpad || createInspiration.isPending}
              >
                <GameIcon icon={GiNotebook} size="sm" />
                {savedToScratchpad ? 'Saved!' : 'Save to Scratchpad'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowSessionPicker(!showSessionPicker)}
              >
                <GameIcon icon={GiBookmark} size="sm" />
                Add to Session
              </Button>
            </div>

            {/* Session picker */}
            {showSessionPicker && (
              <div className="mt-3 border border-border rounded-[--radius-md] bg-bg-raised p-3">
                <p className="text-xs text-text-muted mb-2">Pick a session:</p>
                {sessions && sessions.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleAddToSession(session.id)}
                        className="w-full text-left text-sm px-3 py-2 rounded-[--radius-sm] hover:bg-bg-base transition-colors text-text-body cursor-pointer"
                      >
                        <span className="font-medium">#{session.session_number}</span>{' '}
                        {session.name}
                        <span className="text-xs text-text-muted ml-2">{session.status}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No sessions found for this campaign.</p>
                )}
              </div>
            )}
          </div>
        </SlideUp>
      )}

      {/* Roll controls */}
      {!isComplete && (
        <FadeIn>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleRollNext}
              disabled={rollingRef.current || !nextUnrolledKey}
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
                  disabled={rollingRef.current || !nextUnrolledKey}
                >
                  <GameIcon icon={GiRollingDices} size="sm" />
                  Roll Next
                  {nextUnrolledKey && (
                    <span className="text-xs opacity-75">({TABLE_LABELS[nextUnrolledKey]})</span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRollAll}
                  disabled={rollingRef.current || !nextUnrolledKey}
                >
                  Roll All
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Click table headers to roll individually
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Sub-table cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TABLE_KEYS.map((key) => {
          const tables = location.tables as Record<string, string[]>
          const entries = tables[key]
          const selectedIdx = selections[key]
          const isRolling = rollingColumn === key
          const isExpanded = expandedTables[key] ?? false
          const hasResult = selectedIdx !== null

          return (
            <div
              key={key}
              className={`bg-bg-base rounded-[--radius-md] border transition-colors ${
                isRolling
                  ? 'border-primary/40'
                  : hasResult
                    ? 'border-primary/20'
                    : 'border-border'
              }`}
            >
              {/* Card header — clickable to roll */}
              <button
                onClick={() => handleColumnClick(key)}
                className={`w-full flex items-center justify-between p-3 text-left cursor-pointer transition-colors rounded-t-[--radius-md] ${
                  isRolling
                    ? 'bg-primary/10 text-primary-light'
                    : hasResult
                      ? 'text-primary/80 hover:bg-primary/5'
                      : 'text-text-muted hover:text-text-body hover:bg-bg-raised'
                }`}
              >
                <span className="text-xs uppercase tracking-wider font-medium flex items-center gap-1.5">
                  <GameIcon icon={GiRollingDices} size="sm" />
                  {TABLE_LABELS[key]}
                  {hasResult && (
                    <span className="text-[10px] text-primary font-mono">
                      [{selectedIdx + 1}]
                    </span>
                  )}
                </span>
                {isRolling && (
                  <span className="text-primary font-mono font-bold text-sm animate-pulse">
                    {rollDisplay || '...'}
                  </span>
                )}
              </button>

              {/* Rolled result (always visible when rolled) */}
              {hasResult && !isRolling && (
                <div className="px-3 pb-2">
                  <p className="text-sm text-primary-light font-medium bg-primary/10 rounded-[--radius-sm] px-2 py-1.5">
                    {entries[selectedIdx]}
                  </p>
                </div>
              )}

              {/* Expand/collapse toggle */}
              {hasResult && (
                <button
                  onClick={() => toggleTable(key)}
                  className="w-full text-center text-[10px] text-text-muted hover:text-text-secondary py-1 cursor-pointer transition-colors"
                >
                  {isExpanded ? 'Hide table' : 'Show full table'}
                </button>
              )}

              {/* Full table (expanded or before first roll) */}
              {(isExpanded || !hasResult) && (
                <div className="px-2 pb-2 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {entries.map((entry, idx) => {
                        const isSelected = selectedIdx === idx
                        const isAnimating = isRolling && rollDisplay === idx + 1

                        return (
                          <tr
                            key={idx}
                            className={`border-t border-border/30 transition-colors ${
                              isSelected
                                ? 'bg-primary/15'
                                : isAnimating
                                  ? 'bg-primary/10'
                                  : ''
                            }`}
                          >
                            <td className="py-1 px-1.5 text-text-muted font-mono w-7 text-right">
                              {idx + 1}
                            </td>
                            <td
                              className={`py-1 px-1.5 ${
                                isSelected
                                  ? 'text-primary-light font-medium'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {entry}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
