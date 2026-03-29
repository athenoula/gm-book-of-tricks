# Combatant Info Popover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a click-to-popover on combatant names in the initiative tracker showing full monster stat blocks, NPC details, or PC character sheets using the existing `*FullView` components.

**Architecture:** Store full source data as `source_snapshot` JSONB on the combatant record at add-time. A floating popover component renders the appropriate FullView when the combatant name is clicked. Works in both the full InitiativeTracker and the compact InlineBattle.

**Tech Stack:** React 19, Tailwind CSS 4, motion/react, Supabase (PostgreSQL migration), React portals

---

### Task 1: Database Migration

**Files:**
- Create: `app/supabase/migrations/20260329120000_combatant_source_snapshot.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add source_snapshot JSONB column to combatants table
-- Stores full source data (monster stat block, NPC details, PC sheet) at add-time
-- for the combatant info popover feature
ALTER TABLE combatants ADD COLUMN source_snapshot JSONB DEFAULT NULL;
```

- [ ] **Step 2: Push the migration**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && echo "Y" | npx supabase db push`
Expected: Migration applies successfully.

- [ ] **Step 3: Commit**

```bash
git add app/supabase/migrations/20260329120000_combatant_source_snapshot.sql
git commit -m "feat(initiative): add source_snapshot column to combatants table"
```

---

### Task 2: Update Types and Hooks

**Files:**
- Modify: `app/src/features/initiative/useCombatants.ts`
- Modify: `app/src/features/initiative/useBattles.ts`

- [ ] **Step 1: Add `source_snapshot` to the `Combatant` type**

In `useCombatants.ts`, add to the `Combatant` type (after `notes` on line 19):

```typescript
export type Combatant = {
  id: string
  campaign_id: string
  session_id: string | null
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  armor_class: number
  is_player: boolean
  conditions: string[]
  source_type: 'pc' | 'npc' | 'monster' | null
  source_id: string | null
  source_snapshot: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Add `source_snapshot` to `useAddCombatant` mutation input**

In `useCombatants.ts`, update the `useAddCombatant` mutation input type (line 78-87):

```typescript
return useMutation({
  mutationFn: async (input: {
    campaign_id: string
    session_id?: string
    name: string
    initiative: number
    hp_current: number
    hp_max: number
    armor_class: number
    is_player: boolean
    source_type?: 'pc' | 'npc' | 'monster'
    source_snapshot?: Record<string, unknown>
  }) => {
    const { data, error } = await supabase
      .from('combatants')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data as Combatant
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['combatants', data.campaign_id] })
  },
})
```

- [ ] **Step 3: Add `source_snapshot` to `CombatantSnapshot` type**

In `useBattles.ts`, update the type (line 6-14):

```typescript
export type CombatantSnapshot = {
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  armor_class: number
  is_player: boolean
  conditions: string[]
  source_snapshot?: Record<string, unknown>
}
```

- [ ] **Step 4: Include `source_snapshot` when saving battles**

In `useBattles.ts`, update the `combatant_data` mapping in `useSaveBattle` (line 69-77):

```typescript
const combatant_data: CombatantSnapshot[] = combatants.map((c) => ({
  name: c.name,
  initiative: type === 'template' ? 0 : c.initiative,
  hp_current: type === 'template' ? c.hp_max : c.hp_current,
  hp_max: c.hp_max,
  armor_class: c.armor_class,
  is_player: c.is_player,
  conditions: type === 'template' ? [] : c.conditions,
  ...(c.source_snapshot ? { source_snapshot: c.source_snapshot } : {}),
}))
```

- [ ] **Step 5: Include `source_snapshot` when loading battles**

In `InitiativeTracker.tsx`, update `handleLoadBattle` (line 130-142) to pass `source_snapshot`:

```typescript
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
    ...(snap.source_snapshot ? { source_snapshot: snap.source_snapshot } : {}),
  })
}
```

- [ ] **Step 6: Include `source_snapshot` in the timeline snapshot builder**

In `InitiativeTracker.tsx`, update `buildSnapshot` (line 59-73) to include source_snapshot:

```typescript
const buildSnapshot = useCallback((): Record<string, unknown> => ({
  combatants: sorted.map((c) => ({
    name: c.name,
    initiative: c.initiative,
    hp_current: c.hp_current,
    hp_max: c.hp_max,
    armor_class: c.armor_class,
    is_player: c.is_player,
    conditions: c.conditions,
    ...(c.source_snapshot ? { source_snapshot: c.source_snapshot } : {}),
  })),
  combatant_count: sorted.length,
  round,
  active_index: activeIndex,
  in_combat: inCombat,
}), [sorted, round, activeIndex, inCombat])
```

- [ ] **Step 7: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add app/src/features/initiative/useCombatants.ts app/src/features/initiative/useBattles.ts app/src/features/initiative/InitiativeTracker.tsx
git commit -m "feat(initiative): add source_snapshot to combatant and battle types"
```

---

### Task 3: Enrich QuickAddPanel Snapshots

**Files:**
- Modify: `app/src/features/initiative/QuickAddPanel.tsx`

- [ ] **Step 1: Enrich PC add with full snapshot**

Replace the `addPC` function (lines 27-39):

```typescript
const addPC = (pc: PlayerCharacter) => {
  const scores = pc.ability_scores as AbilityScores
  const init = rollD20() + pc.initiative_bonus
  addCombatant.mutate({
    campaign_id: campaignId,
    session_id: sessionId,
    name: pc.name,
    initiative: init,
    hp_current: pc.hp_current,
    hp_max: pc.hp_max,
    armor_class: pc.armor_class,
    is_player: true,
    source_type: 'pc',
    source_snapshot: {
      name: pc.name, race: pc.race, class: pc.class, subclass: pc.subclass,
      level: pc.level, ability_scores: scores,
      hp_current: pc.hp_current, hp_max: pc.hp_max, armor_class: pc.armor_class,
      speed: pc.speed, proficiency_bonus: pc.proficiency_bonus,
      saving_throw_proficiencies: pc.saving_throw_proficiencies,
      skill_proficiencies: pc.skill_proficiencies,
      equipment: pc.equipment, class_features: pc.class_features,
      traits: pc.traits, personality_traits: pc.personality_traits,
      ideals: pc.ideals, bonds: pc.bonds, flaws: pc.flaws,
      backstory: pc.backstory, appearance: pc.appearance,
      notes: pc.notes, player_name: pc.player_name,
      portrait_url: pc.portrait_url, spellcasting_ability: pc.spellcasting_ability,
      is_pc: true,
    },
  })
}
```

- [ ] **Step 2: Enrich NPC add with full snapshot**

Replace the `addNPC` function (lines 41-54):

```typescript
const addNPC = (npc: NPC) => {
  const dexMod = npc.stats?.dexterity ? abilityModifier(npc.stats.dexterity) : 0
  const init = rollD20() + dexMod
  addCombatant.mutate({
    campaign_id: campaignId,
    session_id: sessionId,
    name: npc.name,
    initiative: init,
    hp_current: npc.stats?.hp ?? 10,
    hp_max: npc.stats?.hp ?? 10,
    armor_class: npc.stats?.ac ?? 10,
    is_player: false,
    source_type: 'npc',
    source_snapshot: {
      name: npc.name, race: npc.race, occupation: npc.occupation,
      personality: npc.personality, appearance: npc.appearance,
      notes: npc.notes, stats: npc.stats,
      portrait_url: npc.portrait_url, stat_block: npc.stat_block,
    },
  })
}
```

- [ ] **Step 3: Enrich Monster add with full snapshot**

Replace the `addMonster` function (lines 56-70):

```typescript
const addMonster = (monster: Monster) => {
  const sb = monster.stat_block as { dexterity?: number } | null
  const dexMod = sb?.dexterity ? abilityModifier(sb.dexterity) : 0
  const init = rollD20() + dexMod
  addCombatant.mutate({
    campaign_id: campaignId,
    session_id: sessionId,
    name: monster.name,
    initiative: init,
    hp_current: monster.hit_points,
    hp_max: monster.hit_points,
    armor_class: monster.armor_class,
    is_player: false,
    source_type: 'monster',
    source_snapshot: {
      name: monster.name, size: monster.size, type: monster.type,
      alignment: monster.alignment, challenge_rating: monster.challenge_rating,
      armor_class: monster.armor_class, hit_points: monster.hit_points,
      hit_dice: monster.hit_dice, speed: monster.speed,
      stat_block: monster.stat_block,
      armor_desc: monster.armor_desc, notes: monster.notes,
    },
  })
}
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/initiative/QuickAddPanel.tsx
git commit -m "feat(initiative): enrich combatant adds with full source snapshots"
```

---

### Task 4: CombatantInfoPopover Component

**Files:**
- Create: `app/src/features/initiative/CombatantInfoPopover.tsx`

- [ ] **Step 1: Create the popover component**

```tsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { MonsterFullView } from '@/features/timeline/full-views/MonsterFullView'
import { NPCFullView } from '@/features/timeline/full-views/NPCFullView'
import { SpellFullView } from '@/features/timeline/full-views/SpellFullView'

interface Props {
  sourceType: 'pc' | 'npc' | 'monster' | null
  sourceSnapshot: Record<string, unknown> | null
  combatantName: string
  combatantHp: number
  combatantHpMax: number
  combatantAc: number
  anchorRect: DOMRect | null
  onClose: () => void
}

export function CombatantInfoPopover({
  sourceType,
  sourceSnapshot,
  combatantName,
  combatantHp,
  combatantHpMax,
  combatantAc,
  anchorRect,
  onClose,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Position calculation
  const style = anchorRect ? getPopoverPosition(anchorRect) : {}

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Popover */}
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 w-[400px] max-w-[90vw] max-h-[60vh] overflow-y-auto bg-bg-base border border-amber-500/40 rounded-[--radius-lg] shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        style={style}
      >
        <div className="p-4">
          {sourceSnapshot && (sourceType === 'monster') && (
            <MonsterFullView data={sourceSnapshot} />
          )}
          {sourceSnapshot && (sourceType === 'npc' || sourceType === 'pc') && (
            <NPCFullView data={sourceSnapshot} />
          )}
          {!sourceSnapshot && (
            <MinimalCard
              name={combatantName}
              hp={combatantHp}
              hpMax={combatantHpMax}
              ac={combatantAc}
            />
          )}
        </div>
      </motion.div>
    </>,
    document.body,
  )
}

function MinimalCard({ name, hp, hpMax, ac }: { name: string; hp: number; hpMax: number; ac: number }) {
  return (
    <div className="text-sm space-y-2">
      <div className="text-text-heading font-medium">{name}</div>
      <div className="flex gap-4 text-xs text-text-secondary">
        <span><span className="text-text-muted">HP</span> {hp}/{hpMax}</span>
        <span><span className="text-text-muted">AC</span> {ac}</span>
      </div>
      <p className="text-xs text-text-muted italic">No source data available — combatant was added manually or before this feature.</p>
    </div>
  )
}

function getPopoverPosition(anchor: DOMRect): React.CSSProperties {
  const gap = 8
  const popoverHeight = 400 // estimate for flip logic
  const spaceBelow = window.innerHeight - anchor.bottom
  const placeAbove = spaceBelow < popoverHeight && anchor.top > popoverHeight

  const top = placeAbove
    ? Math.max(8, anchor.top - popoverHeight - gap)
    : anchor.bottom + gap

  const left = Math.max(8, Math.min(
    anchor.left + anchor.width / 2 - 200, // center the 400px popover
    window.innerWidth - 408, // 400 + 8px margin
  ))

  return { top, left }
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/initiative/CombatantInfoPopover.tsx
git commit -m "feat(initiative): add CombatantInfoPopover component with portal rendering"
```

---

### Task 5: Make CombatantRow Name Clickable

**Files:**
- Modify: `app/src/features/initiative/CombatantRow.tsx`

- [ ] **Step 1: Add `onShowInfo` callback and `nameRef` to props and state**

Update the Props interface and component (lines 7-13):

```tsx
interface Props {
  combatant: Combatant
  isActive: boolean
  inCombat: boolean
  onShowInfo?: (rect: DOMRect) => void
}

export function CombatantRow({ combatant, isActive, inCombat, onShowInfo }: Props) {
```

- [ ] **Step 2: Replace the name `<span>` with a clickable button**

Replace the name span (line 68-70):

```tsx
<button
  onClick={(e) => onShowInfo?.((e.currentTarget as HTMLElement).getBoundingClientRect())}
  className={`font-medium truncate cursor-pointer hover:underline hover:decoration-amber-500/50 ${isDowned ? 'line-through' : 'text-text-heading'}`}
>
  {combatant.name}
</button>
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/initiative/CombatantRow.tsx
git commit -m "feat(initiative): make combatant name clickable for info popover"
```

---

### Task 6: Integrate Popover into InitiativeTracker

**Files:**
- Modify: `app/src/features/initiative/InitiativeTracker.tsx`

- [ ] **Step 1: Add popover state and import**

At the top of `InitiativeTracker.tsx`, add the import:

```tsx
import { CombatantInfoPopover } from './CombatantInfoPopover'
```

Inside the component, after the existing state declarations (around line 39), add:

```tsx
const [popoverCombatantId, setPopoverCombatantId] = useState<string | null>(null)
const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null)

const popoverCombatant = popoverCombatantId ? sorted.find((c) => c.id === popoverCombatantId) : null
```

- [ ] **Step 2: Pass `onShowInfo` to CombatantRow**

Update the CombatantRow rendering (lines 213-218):

```tsx
<CombatantRow
  key={combatant.id}
  combatant={combatant}
  isActive={index === activeIndex}
  inCombat={inCombat}
  onShowInfo={(rect) => {
    setPopoverCombatantId(combatant.id)
    setPopoverAnchorRect(rect)
  }}
/>
```

- [ ] **Step 3: Render the popover**

At the end of the component's return, just before the closing `</div>` (line 338), add:

```tsx
{/* Info Popover */}
{popoverCombatant && (
  <CombatantInfoPopover
    sourceType={popoverCombatant.source_type}
    sourceSnapshot={popoverCombatant.source_snapshot}
    combatantName={popoverCombatant.name}
    combatantHp={popoverCombatant.hp_current}
    combatantHpMax={popoverCombatant.hp_max}
    combatantAc={popoverCombatant.armor_class}
    anchorRect={popoverAnchorRect}
    onClose={() => { setPopoverCombatantId(null); setPopoverAnchorRect(null) }}
  />
)}
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/initiative/InitiativeTracker.tsx
git commit -m "feat(initiative): integrate info popover into InitiativeTracker"
```

---

### Task 7: Integrate Popover into InlineBattle

**Files:**
- Modify: `app/src/features/timeline/InlineBattle.tsx`

- [ ] **Step 1: Add `source_snapshot` to `SnapshotCombatant` type**

Update the interface (lines 7-15):

```tsx
interface SnapshotCombatant {
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  armor_class: number
  is_player: boolean
  conditions: string[]
  source_snapshot?: Record<string, unknown>
}
```

- [ ] **Step 2: Add popover state and import**

Add the import at the top:

```tsx
import { CombatantInfoPopover } from '@/features/initiative/CombatantInfoPopover'
```

Inside the `InlineBattle` component, after the existing state declarations (line 36), add:

```tsx
const [popoverIndex, setPopoverIndex] = useState<number | null>(null)
const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null)

const popoverCombatant = popoverIndex !== null ? combatants[popoverIndex] : null
```

- [ ] **Step 3: Pass `onShowInfo` to CombatantInlineRow**

Update the CombatantInlineRow rendering (lines 137-146) to add the callback:

```tsx
<CombatantInlineRow
  key={`${c.name}-${index}`}
  combatant={c}
  isActive={isActive}
  isDowned={isDowned}
  hpPercent={hpPercent}
  onAdjustHp={(delta) => adjustHp(index, delta)}
  onToggleCondition={(cond) => toggleCondition(index, cond)}
  onShowInfo={(rect) => {
    setPopoverIndex(index)
    setPopoverAnchorRect(rect)
  }}
/>
```

- [ ] **Step 4: Render the popover**

After the combatant rows `</div>` (around line 148), add:

```tsx
{/* Info Popover */}
{popoverCombatant && (
  <CombatantInfoPopover
    sourceType={popoverCombatant.source_snapshot ? (popoverCombatant.source_snapshot.is_pc ? 'pc' : popoverCombatant.source_snapshot.stat_block ? 'monster' : 'npc') as 'pc' | 'npc' | 'monster' : null}
    sourceSnapshot={popoverCombatant.source_snapshot ?? null}
    combatantName={popoverCombatant.name}
    combatantHp={popoverCombatant.hp_current}
    combatantHpMax={popoverCombatant.hp_max}
    combatantAc={popoverCombatant.armor_class}
    anchorRect={popoverAnchorRect}
    onClose={() => { setPopoverIndex(null); setPopoverAnchorRect(null) }}
  />
)}
```

- [ ] **Step 5: Update `CombatantInlineRow` to accept and handle `onShowInfo`**

Update the function signature and the name element (lines 153-178):

```tsx
function CombatantInlineRow({ combatant, isActive, isDowned, hpPercent, onAdjustHp, onToggleCondition, onShowInfo }: {
  combatant: SnapshotCombatant
  isActive: boolean
  isDowned: boolean
  hpPercent: number
  onAdjustHp: (delta: number) => void
  onToggleCondition: (cond: string) => void
  onShowInfo?: (rect: DOMRect) => void
}) {
```

Then replace the name `<span>` (line 177):

```tsx
<button
  onClick={(e) => onShowInfo?.((e.currentTarget as HTMLElement).getBoundingClientRect())}
  className={`text-sm font-medium truncate block cursor-pointer hover:underline hover:decoration-amber-500/50 ${isDowned ? 'line-through' : 'text-text-heading'}`}
>
  {combatant.name}
</button>
```

- [ ] **Step 6: Include `source_snapshot` in saveState**

Update the `saveState` function (line 53-55) to preserve `source_snapshot` in the persisted data. The combatants array already includes `source_snapshot` from the type — no change needed since it spreads the full combatant object. Verify this is the case by checking that `SnapshotCombatant` includes the field (done in step 1).

- [ ] **Step 7: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add app/src/features/timeline/InlineBattle.tsx
git commit -m "feat(initiative): integrate info popover into InlineBattle"
```

---

### Task 8: Final Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 2: Run build**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Manual smoke test**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npm run dev`

Verification checklist:
1. Navigate to Initiative Tracker page
2. Quick Add a monster → click its name → popover shows full stat block
3. Quick Add an NPC → click its name → popover shows personality, appearance, notes, stats
4. Quick Add a PC → click its name → popover shows full character sheet
5. Manual Add a combatant → click its name → popover shows minimal card (name, HP, AC)
6. Click backdrop → popover closes
7. Press Escape → popover closes
8. Click one name, then another → first closes, second opens
9. Navigate to a session timeline with a battle block
10. Click "Edit Battle" → in the inline tracker, click a name → popover works
11. In the compact InlineBattle view, click a name → popover works
12. Save a battle as template → load it → click name → popover shows info (source_snapshot preserved)
