import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiCrossedSwords, GiLightningStorm, GiSaveArrow, GiOpenFolder } from '@/components/ui/icons'
import { useCombatants, useClearCombatants, useAddCombatant } from './useCombatants'
import { useCombatState } from './useCombatState'
import { useBattles, useSaveBattle, useDeleteBattle } from './useBattles'
import { CombatantRow } from './CombatantRow'
import { AddCombatantForm } from './AddCombatantForm'
import { QuickAddPanel } from './QuickAddPanel'
import { rollD20 } from '@/lib/dnd'
import type { Combatant } from './useCombatants'
import type { Battle } from './useBattles'

interface Props {
  campaignId: string
  sessionId?: string
  onSaveToTimeline?: (battle: { title: string; snapshot: Record<string, unknown> }) => void
  inline?: boolean
  battleId?: string
  onSnapshotUpdate?: (snapshot: Record<string, unknown>) => void
}

export function InitiativeTracker({ campaignId, sessionId, onSaveToTimeline, inline, battleId, onSnapshotUpdate }: Props) {
  const { data: combatants, isLoading } = useCombatants(campaignId, sessionId)
  const { data: battles } = useBattles(campaignId)
  const { inCombat, round, activeIndex, startCombat, nextTurn, endCombat, reset } = useCombatState()
  const clearCombatants = useClearCombatants()
  const addCombatant = useAddCombatant()
  const saveBattle = useSaveBattle()
  const deleteBattle = useDeleteBattle()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [showLoad, setShowLoad] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveType, setSaveType] = useState<'template' | 'save_state'>('template')

  const sorted = combatants
    ? [...combatants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name))
    : []

  // Auto-load battle when battleId is provided
  const loadedBattleRef = useRef<string | null>(null)
  useEffect(() => {
    if (!battleId || !battles || loadedBattleRef.current === battleId) return
    const battle = battles.find((b) => b.id === battleId)
    if (battle) {
      loadedBattleRef.current = battleId
      handleLoadBattle(battle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, battles])

  // Call onSnapshotUpdate when combatants or combat state changes
  const prevSnapshotRef = useRef<string>('')
  const buildSnapshot = useCallback((): Record<string, unknown> => ({
    combatants: sorted.map((c) => ({
      name: c.name,
      initiative: c.initiative,
      hp_current: c.hp_current,
      hp_max: c.hp_max,
      armor_class: c.armor_class,
      is_player: c.is_player,
      conditions: c.conditions,
    })),
    combatant_count: sorted.length,
    round,
    active_index: activeIndex,
    in_combat: inCombat,
  }), [sorted, round, activeIndex, inCombat])

  useEffect(() => {
    if (!onSnapshotUpdate || sorted.length === 0) return
    const snapshot = buildSnapshot()
    const key = JSON.stringify(snapshot)
    if (key !== prevSnapshotRef.current) {
      prevSnapshotRef.current = key
      onSnapshotUpdate(snapshot)
    }
  }, [onSnapshotUpdate, sorted, buildSnapshot])

  const handleClear = () => {
    if (window.confirm('Remove all combatants? This cannot be undone.')) {
      clearCombatants.mutate({ campaignId, sessionId })
      reset()
    }
  }

  const handleSaveBattle = async () => {
    if (!saveName.trim() || !combatants?.length) return
    const battle = await saveBattle.mutateAsync({
      campaignId,
      sessionId,
      name: saveName,
      type: saveType,
      combatants: sorted,
      round,
      activeIndex,
      inCombat,
    })

    // Optionally add to timeline
    if (onSaveToTimeline) {
      onSaveToTimeline({
        title: saveName,
        snapshot: {
          name: battle.name,
          type: battle.type,
          combatant_count: battle.combatant_data.length,
          combatants: battle.combatant_data,
        },
      })
    }

    setSaveName('')
    setShowSave(false)
  }

  const handleLoadBattle = async (battle: Battle) => {
    // Clear existing combatants
    if (sorted.length > 0) {
      await clearCombatants.mutateAsync({ campaignId, sessionId })
    }
    reset()

    // Add combatants from battle snapshot
    for (const snap of battle.combatant_data) {
      const init = battle.type === 'template' ? rollD20() : snap.initiative
      await addCombatant.mutateAsync({
        campaign_id: campaignId,
        session_id: sessionId,
        name: snap.name,
        initiative: init,
        hp_current: snap.hp_current,
        hp_max: snap.hp_max,
        armor_class: snap.armor_class,
        is_player: snap.is_player,
      })
    }

    if (battle.type === 'save_state' && battle.in_combat) {
      startCombat()
    }

    setShowLoad(false)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-sm">Loading tracker...</p>
      </div>
    )
  }

  return (
    <div data-tutorial="initiative-tracker">
      {/* Header */}
      <div className={`flex items-center justify-between ${inline ? 'mb-2' : 'mb-4'}`}>
        {!inline && (
          <h3 className="text-xl flex items-center gap-2"><GameIcon icon={GiCrossedSwords} size="xl" /> Initiative</h3>
        )}
        <div className={`flex items-center gap-2 flex-wrap ${inline ? 'w-full justify-between' : ''}`}>
          {sorted.length > 0 && !inCombat && (
            <Button size="sm" onClick={startCombat}>
              Start Combat
            </Button>
          )}
          {inCombat && (
            <>
              <span className="text-sm text-text-secondary font-mono">
                Round {round}
              </span>
              <Button size="sm" onClick={() => nextTurn(sorted.length)}>
                Next Turn
              </Button>
              <Button size="sm" variant="secondary" onClick={endCombat}>
                End Combat
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Combatant list */}
      {sorted.length === 0 ? (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center mb-4">
          <div className="text-3xl mb-3"><GameIcon icon={GiCrossedSwords} size="3xl" /></div>
          <p className="text-text-secondary text-sm mb-4">
            No combatants yet. Add from your campaign or manually.
          </p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={() => setShowQuickAdd(true)}>
              Quick Add
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowAddForm(true)}>
              Manual Add
            </Button>
            {battles && battles.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setShowLoad(true)}>
                Load Battle
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          <AnimatePresence mode="popLayout">
            {sorted.map((combatant, index) => (
              <CombatantRow
                key={combatant.id}
                combatant={combatant}
                isActive={index === activeIndex}
                inCombat={inCombat}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="secondary" onClick={() => { setShowQuickAdd(!showQuickAdd); setShowAddForm(false); setShowSave(false); setShowLoad(false) }}>
          {showQuickAdd ? 'Hide' : <><GameIcon icon={GiLightningStorm} size="sm" /> Quick Add</>}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setShowAddForm(!showAddForm); setShowQuickAdd(false); setShowSave(false); setShowLoad(false) }}>
          {showAddForm ? 'Hide' : '+ Manual'}
        </Button>
        {!inline && sorted.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => { setShowSave(!showSave); setShowQuickAdd(false); setShowAddForm(false); setShowLoad(false) }}>
            {showSave ? 'Hide' : <><GameIcon icon={GiSaveArrow} size="sm" /> Save</>}
          </Button>
        )}
        {!inline && (
          <Button size="sm" variant="secondary" onClick={() => { setShowLoad(!showLoad); setShowQuickAdd(false); setShowAddForm(false); setShowSave(false) }}>
            {showLoad ? 'Hide' : <><GameIcon icon={GiOpenFolder} size="sm" /> Load</>}
          </Button>
        )}
        {sorted.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleClear}>
            Clear All
          </Button>
        )}
      </div>

      {/* Quick Add Panel */}
      {showQuickAdd && (
        <div className="mt-4 bg-bg-base rounded-[--radius-lg] border border-border p-4">
          <h4 className="text-sm text-text-heading font-medium mb-3">Quick Add from Campaign</h4>
          <QuickAddPanel campaignId={campaignId} sessionId={sessionId} />
        </div>
      )}

      {/* Manual Add Form */}
      {showAddForm && (
        <div className="mt-4 bg-bg-base rounded-[--radius-lg] border border-border p-4">
          <AddCombatantForm
            campaignId={campaignId}
            sessionId={sessionId}
            onAdded={() => {}}
          />
        </div>
      )}

      {/* Save Battle */}
      {!inline && showSave && (
        <div className="mt-4 bg-bg-base rounded-[--radius-lg] border border-border p-4 space-y-3">
          <h4 className="text-sm text-text-heading font-medium">Save Encounter</h4>
          <Input
            label="Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Goblin Ambush"
          />
          <div className="flex gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={saveType === 'template'}
                onChange={() => setSaveType('template')}
                className="accent-primary"
              />
              <span className="text-sm text-text-secondary">Template (full HP, no conditions)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={saveType === 'save_state'}
                onChange={() => setSaveType('save_state')}
                className="accent-primary"
              />
              <span className="text-sm text-text-secondary">Save State (current HP/conditions)</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveBattle} disabled={saveBattle.isPending || !saveName.trim()}>
              {saveBattle.isPending ? 'Saving...' : 'Save'}
            </Button>
            {onSaveToTimeline && (
              <span className="text-xs text-text-muted self-center">Also adds to session timeline</span>
            )}
          </div>
        </div>
      )}

      {/* Load Battle */}
      {!inline && showLoad && (
        <div className="mt-4 bg-bg-base rounded-[--radius-lg] border border-border p-4">
          <h4 className="text-sm text-text-heading font-medium mb-3">Load Battle</h4>
          {(!battles || battles.length === 0) ? (
            <p className="text-xs text-text-muted">No saved battles yet.</p>
          ) : (
            <div className="space-y-1">
              {battles.map((b) => (
                <div key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-[--radius-sm] hover:bg-bg-raised transition-colors group">
                  <span className="text-sm text-text-body flex-1">{b.name}</span>
                  <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
                    {b.type === 'template' ? 'Template' : 'Save'} · {b.combatant_data.length} combatants
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleLoadBattle(b)}>
                    Load
                  </Button>
                  <button
                    onClick={() => deleteBattle.mutate({ id: b.id, campaignId })}
                    className="text-text-muted hover:text-danger text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
