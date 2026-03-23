# Gameplay Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six gameplay improvements: remove Play mode, active combatant glow, pin timeline items, 3D dice roller, loot/inventory system, and character XP tracking.

**Architecture:** Features 1-3 modify existing components (timeline, initiative). Feature 4 adds a new dice feature module with `@3d-dice/dice-box`. Feature 5 adds inventory tables and a new feature module. Feature 6 adds an XP column and UI to the PC sheet.

**Tech Stack:** React 19, TanStack Query, Supabase, Tailwind CSS 4, Zustand, `@3d-dice/dice-box`, motion/react

**Spec:** `docs/superpowers/specs/2026-03-23-gameplay-features-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| **Feature 1: Remove Play Mode** | | |
| `app/src/features/timeline/SessionTimeline.tsx` | Modify | Remove isPrep state, toggle UI, always-prep behavior |
| `app/src/features/timeline/SceneBlock.tsx` | Modify | Remove isPrep prop, always show controls |
| `app/src/features/timeline/TimelineBlockCard.tsx` | Modify | Remove isPrep prop, always show controls |
| **Feature 2: Active Combatant Glow** | | |
| `app/src/features/initiative/CombatantRow.tsx` | Modify | Add glow class when active |
| `app/src/index.css` | Modify | Add pulse-glow keyframes |
| **Feature 3: Pin Timeline Items** | | |
| `app/src/features/timeline/SessionTimeline.tsx` | Modify | Pin state, render pinned item at top |
| `app/src/features/timeline/SceneBlock.tsx` | Modify | Add pin button |
| `app/src/features/timeline/TimelineBlockCard.tsx` | Modify | Add pin button |
| **Feature 4: Dice Roller** | | |
| `app/src/features/dice/DiceRoller.tsx` | Create | Drawer with dice selection, 3D canvas, results, history |
| `app/src/features/sessions/SessionPage.tsx` | Modify | Add dice button + mount drawer |
| **Feature 5: Loot & Inventory** | | |
| `app/supabase/migrations/20260323120000_inventory.sql` | Create | items, character_inventory, party_treasure tables |
| `app/src/lib/open5e.ts` | Modify | Add fetchMagicItems, fetchWeapons, fetchArmor |
| `app/src/features/inventory/useItems.ts` | Create | Items CRUD + SRD import |
| `app/src/features/inventory/useCharacterInventory.ts` | Create | Character inventory CRUD |
| `app/src/features/inventory/usePartyTreasure.ts` | Create | Party treasure CRUD |
| `app/src/features/inventory/ItemSearch.tsx` | Create | Reusable item search (campaign + SRD) |
| `app/src/features/inventory/CharacterInventory.tsx` | Create | PC sheet inventory section |
| `app/src/features/inventory/PartyTreasure.tsx` | Create | Campaign overview treasure section |
| `app/src/features/characters/PCSheet.tsx` | Modify | Mount CharacterInventory |
| `app/src/features/campaigns/CampaignOverview.tsx` | Modify | Mount PartyTreasure |
| **Feature 6: Character XP** | | |
| `app/supabase/migrations/20260323120100_xp.sql` | Create | Add xp column to player_characters |
| `app/src/lib/types.ts` | Modify | Add xp to PlayerCharacter type |
| `app/src/lib/data/xp-thresholds.ts` | Create | Static 5e XP table |
| `app/src/features/characters/PCSheet.tsx` | Modify | Add XP section with progress bar |

---

### Task 1: Remove Play Mode

**Files:**
- Modify: `app/src/features/timeline/SessionTimeline.tsx`
- Modify: `app/src/features/timeline/SceneBlock.tsx`
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx`

This task removes the Prep/Play toggle entirely. Everything always behaves as Prep mode.

- [ ] **Step 1: Update SessionTimeline.tsx**

Read `app/src/features/timeline/SessionTimeline.tsx`. Make these changes:

1. Remove line 30: `const [isPrep, setIsPrep] = useState(true)` — replace all references to `isPrep` with `true` (or just remove the conditionals)
2. Remove the Prep/Play toggle buttons (lines ~115-133) — the entire toggle UI div
3. On `<Droppable>`: change `isDropDisabled={!isPrep}` to `isDropDisabled={false}` (or just remove it)
4. On `<Draggable>`: change `isDragDisabled={!isPrep}` to `isDragDisabled={false}` (or just remove it)
5. On `<SceneBlock>`: remove `isPrep={isPrep}` prop
6. On `<TimelineBlockCard>`: remove `isPrep={isPrep}` prop
7. The "+ Scene" button and Library button: remove `{isPrep && ...}` guards — always show them
8. Mobile action buttons: remove `{isPrep && ...}` guard

- [ ] **Step 2: Update SceneBlock.tsx**

Read `app/src/features/timeline/SceneBlock.tsx`. Make these changes:

1. Remove `isPrep` from the Props interface
2. Remove `isPrep` from the destructured props
3. Remove the useEffect that auto-saves on Prep→Play switch (the one checking `!isPrep && editing`)
4. Remove all `isPrep &&` guards — drag handle, edit buttons, delete button should always render
5. Change `editing && isPrep` to just `editing` everywhere (SceneEditor editable prop, header edit mode)

- [ ] **Step 3: Update TimelineBlockCard.tsx**

Read `app/src/features/timeline/TimelineBlockCard.tsx`. Make these changes:

1. Remove `isPrep` from the Props interface
2. Remove `isPrep` from the destructured props
3. Remove all `isPrep &&` guards — drag handle, edit buttons, delete button should always render
4. Change `block.block_type === 'note' && isPrep` to `block.block_type === 'note'`
5. Change `block.block_type === 'battle' && isPrep` to `block.block_type === 'battle'`

- [ ] **Step 4: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/src/features/timeline/SessionTimeline.tsx app/src/features/timeline/SceneBlock.tsx app/src/features/timeline/TimelineBlockCard.tsx
git commit -m "refactor: remove Play mode, always show editing controls"
```

---

### Task 2: Active Combatant Glow

**Files:**
- Modify: `app/src/features/initiative/CombatantRow.tsx`
- Modify: `app/src/index.css`

- [ ] **Step 1: Add pulse-glow keyframes to index.css**

Append to `app/src/index.css` (after existing custom styles):

```css
/* ─── Active Combatant Glow ─── */

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.15);
  }
  50% {
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.2), 0 0 16px rgba(245, 158, 11, 0.08);
  }
}

.combatant-active-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

- [ ] **Step 2: Update CombatantRow styling**

Read `app/src/features/initiative/CombatantRow.tsx`. Find the combatant container element that has the conditional border styling for active state (around line 49-52). Add the `combatant-active-glow` class when `isActive && inCombat`.

Change the active styling from something like:
```
${isActive && inCombat ? 'border-primary bg-primary-ghost' : 'border-border bg-bg-base'}
```
To:
```
${isActive && inCombat ? 'border-primary bg-primary-ghost combatant-active-glow' : 'border-border bg-bg-base'}
```

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/initiative/CombatantRow.tsx app/src/index.css
git commit -m "feat: add amber pulse glow to active combatant"
```

---

### Task 3: Pin Timeline Items

**Files:**
- Modify: `app/src/features/timeline/SessionTimeline.tsx`
- Modify: `app/src/features/timeline/SceneBlock.tsx`
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx`

- [ ] **Step 1: Add pin state to SessionTimeline**

Read `app/src/features/timeline/SessionTimeline.tsx`. Add pin state and handler:

```typescript
const [pinnedItemId, setPinnedItemId] = useState<string | null>(null)

const handlePin = (itemId: string) => {
  setPinnedItemId((prev) => (prev === itemId ? null : itemId))
}
```

- [ ] **Step 2: Render pinned item at the top of the timeline**

Before the `DragDropContext`, add a pinned item render section:

```tsx
{/* Pinned item */}
{pinnedItemId && (() => {
  const pinned = timeline.find((item) => {
    const id = item.kind === 'scene' ? item.data.id : item.data.id
    return id === pinnedItemId
  })
  if (!pinned) return null
  return (
    <div className="mb-3 relative">
      <div className="absolute -top-2 left-3 bg-primary text-text-inverse text-[10px] px-2 py-0.5 rounded-full font-medium z-10">
        Pinned
      </div>
      {pinned.kind === 'scene' ? (
        <SceneBlock
          scene={pinned.data}
          dragHandleProps={undefined}
          isPinned={true}
          onPin={() => handlePin(pinned.data.id)}
        />
      ) : (
        <TimelineBlockCard
          block={pinned.data}
          dragHandleProps={undefined}
          isPinned={true}
          onPin={() => handlePin(pinned.data.id)}
        />
      )}
    </div>
  )
})()}
```

- [ ] **Step 3: Pass pin props to SceneBlock and TimelineBlockCard**

In the timeline map, pass `onPin` and `isPinned` to each item:

```tsx
<SceneBlock
  scene={item.data}
  dragHandleProps={provided.dragHandleProps ?? undefined}
  onPin={() => handlePin(item.data.id)}
  isPinned={pinnedItemId === item.data.id}
/>
```

Same for TimelineBlockCard.

- [ ] **Step 4: Add pin button to SceneBlock**

Read `app/src/features/timeline/SceneBlock.tsx`. Add `onPin` and `isPinned` to the Props interface:

```typescript
interface Props {
  scene: Scene
  dragHandleProps?: Record<string, unknown>
  onPin?: () => void
  isPinned?: boolean
}
```

Add a pin button in the header (next to the edit/delete buttons):

```tsx
{onPin && (
  <Button size="sm" variant="ghost" onClick={onPin} title={isPinned ? 'Unpin' : 'Pin to top'}>
    {isPinned ? '📌' : '📍'}
  </Button>
)}
```

Note to implementer: Replace emoji with a game icon if one exists (check `icons.ts` for `GiPin` or similar), or use a simple SVG/text character.

- [ ] **Step 5: Add pin button to TimelineBlockCard**

Same pattern — add `onPin` and `isPinned` to Props, add pin button in header.

- [ ] **Step 6: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add app/src/features/timeline/SessionTimeline.tsx app/src/features/timeline/SceneBlock.tsx app/src/features/timeline/TimelineBlockCard.tsx
git commit -m "feat: add pin/unpin for timeline items"
```

---

### Task 4: Dice Roller — Install & Setup

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install @3d-dice/dice-box**

```bash
cd app && npm install @3d-dice/dice-box
```

- [ ] **Step 2: Copy dice-box assets to public**

`@3d-dice/dice-box` needs its WASM and worker files served statically. Copy them:

```bash
cp -r app/node_modules/@3d-dice/dice-box/dist/assets app/public/dice-box-assets
```

If the asset path differs, check `node_modules/@3d-dice/dice-box/dist/` for the actual structure and adjust.

- [ ] **Step 3: Verify the assets are in place**

```bash
ls app/public/dice-box-assets/
```

Expected: WASM files, worker JS files, dice theme assets.

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/public/dice-box-assets/
git commit -m "chore: install @3d-dice/dice-box and copy assets to public"
```

---

### Task 5: Dice Roller — Component

**Files:**
- Create: `app/src/features/dice/DiceRoller.tsx`
- Modify: `app/src/features/sessions/SessionPage.tsx`

- [ ] **Step 1: Create DiceRoller component**

Create `app/src/features/dice/DiceRoller.tsx`. This is a right-side drawer with:

1. Dice type selector (d4, d6, d8, d10, d12, d20, d100) with quantity +/- buttons
2. Roll button
3. 3D canvas for `@3d-dice/dice-box` rendering
4. Results display (total + individual)
5. Roll history

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { AnimatePresence, motion } from '@/components/motion'
import DiceBox from '@3d-dice/dice-box'

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const
type DiceType = typeof DICE_TYPES[number]

interface RollResult {
  id: number
  dice: string
  values: number[]
  total: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DiceRoller({ isOpen, onClose }: Props) {
  const [quantities, setQuantities] = useState<Record<DiceType, number>>(
    () => Object.fromEntries(DICE_TYPES.map((d) => [d, 0])) as Record<DiceType, number>
  )
  const [results, setResults] = useState<RollResult[]>([])
  const [rolling, setRolling] = useState(false)
  const diceBoxRef = useRef<DiceBox | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)

  // Initialize dice-box when drawer opens
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current || diceBoxRef.current) return

    const initDiceBox = async () => {
      const box = new DiceBox('#dice-canvas-container', {
        assetPath: '/dice-box-assets/',
        theme: 'default',
        scale: 6,
        gravity: 1,
        mass: 1,
        spinForce: 4,
        throwForce: 5,
      })
      await box.init()
      diceBoxRef.current = box
    }

    initDiceBox().catch(console.error)

    return () => {
      if (diceBoxRef.current) {
        diceBoxRef.current.clear()
        diceBoxRef.current = null
      }
    }
  }, [isOpen])

  const handleQuantityChange = (die: DiceType, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [die]: Math.max(0, Math.min(20, prev[die] + delta)),
    }))
  }

  const handleRoll = useCallback(async () => {
    if (!diceBoxRef.current || rolling) return

    // Build dice notation string e.g. "2d6+1d20"
    const notation = DICE_TYPES
      .filter((d) => quantities[d] > 0)
      .map((d) => `${quantities[d]}${d}`)
      .join('+')

    if (!notation) return

    setRolling(true)

    try {
      const result = await diceBoxRef.current.roll(notation)

      // Parse results from dice-box
      const values = result.map((r: { value: number }) => r.value)
      const total = values.reduce((sum: number, v: number) => sum + v, 0)

      setResults((prev) => [
        {
          id: nextId.current++,
          dice: notation,
          values,
          total,
        },
        ...prev.slice(0, 19), // Keep last 20 rolls
      ])
    } catch (err) {
      console.error('Dice roll error:', err)
    } finally {
      setRolling(false)
    }
  }, [quantities, rolling])

  const handleClear = () => {
    setQuantities(Object.fromEntries(DICE_TYPES.map((d) => [d, 0])) as Record<DiceType, number>)
    if (diceBoxRef.current) diceBoxRef.current.clear()
  }

  const hasDice = DICE_TYPES.some((d) => quantities[d] > 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed top-0 right-0 bottom-0 w-[350px] bg-bg-base border-l border-border z-40 flex flex-col shadow-lg"
          initial={{ x: 350 }}
          animate={{ x: 0 }}
          exit={{ x: 350 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-text-heading">Dice Roller</h3>
            <button onClick={onClose} className="text-text-muted hover:text-text-body cursor-pointer">✕</button>
          </div>

          {/* Dice selectors */}
          <div className="px-4 py-3 border-b border-border">
            <div className="grid grid-cols-4 gap-2">
              {DICE_TYPES.map((die) => (
                <div key={die} className="text-center">
                  <div className="text-xs text-text-muted mb-1">{die.toUpperCase()}</div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleQuantityChange(die, -1)}
                      className="w-6 h-6 rounded bg-bg-raised text-text-muted hover:text-text-body text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className={`w-6 text-center text-sm font-mono ${quantities[die] > 0 ? 'text-primary-light font-bold' : 'text-text-muted'}`}>
                      {quantities[die]}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(die, 1)}
                      className="w-6 h-6 rounded bg-bg-raised text-text-muted hover:text-text-body text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleRoll} disabled={!hasDice || rolling} className="flex-1">
                {rolling ? 'Rolling...' : 'Roll'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear}>Clear</Button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div
            id="dice-canvas-container"
            ref={canvasContainerRef}
            className="h-[200px] bg-bg-deep relative"
          />

          {/* Results / History */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {results.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">Roll some dice!</p>
            ) : (
              <div className="space-y-2">
                {results.map((roll, i) => (
                  <div
                    key={roll.id}
                    className={`rounded-[--radius-md] p-2 ${i === 0 ? 'bg-primary-ghost border border-primary/20' : 'bg-bg-raised'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">{roll.dice}</span>
                      <span className={`font-mono font-bold ${i === 0 ? 'text-primary-light text-lg' : 'text-text-heading text-sm'}`}>
                        {roll.total}
                      </span>
                    </div>
                    {roll.values.length > 1 && (
                      <div className="text-[10px] text-text-muted mt-0.5">
                        [{roll.values.join(', ')}]
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**IMPORTANT NOTE for implementer:** The `@3d-dice/dice-box` API may differ from what's shown above. Read the actual package docs/README at `node_modules/@3d-dice/dice-box/README.md` before implementing. Key things to check:
- Constructor arguments (container selector, options)
- The `roll()` method signature and return type
- Asset path configuration (`assetPath` option)
- The `init()` method — may need to be called before rolling
- The `clear()` method for cleanup

If the API differs significantly, adapt the component accordingly. The UI structure and behavior should match the spec regardless of the exact dice-box API.

- [ ] **Step 2: Create the features/dice directory**

```bash
mkdir -p "app/src/features/dice"
```

- [ ] **Step 3: Add dice button and drawer to SessionPage**

Read `app/src/features/sessions/SessionPage.tsx`. Add:

1. Import: `import { DiceRoller } from '@/features/dice/DiceRoller'`
2. State: `const [showDice, setShowDice] = useState(false)`
3. Add a dice button in the session header next to the Initiative button. Find the existing pattern for the Initiative button and add a similar one:

```tsx
<Button
  size="sm"
  variant={showDice ? 'primary' : 'secondary'}
  onClick={() => setShowDice(!showDice)}
>
  🎲 Dice
</Button>
```

Note: Replace emoji with a game icon if available (check `icons.ts` for `GiRollingDices`).

4. Mount the drawer at the end of the component (before closing `</div>`):

```tsx
<DiceRoller isOpen={showDice} onClose={() => setShowDice(false)} />
```

- [ ] **Step 4: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Fix any type errors — the `@3d-dice/dice-box` package may not have TypeScript types. If not, add a declaration:

Create `app/src/types/dice-box.d.ts`:
```typescript
declare module '@3d-dice/dice-box' {
  export default class DiceBox {
    constructor(container: string, options?: Record<string, unknown>)
    init(): Promise<void>
    roll(notation: string): Promise<{ value: number }[]>
    clear(): void
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/src/features/dice/ app/src/features/sessions/SessionPage.tsx app/src/types/
git commit -m "feat: add 3D dice roller drawer with physics simulation"
```

---

### Task 6: Database Migration — Inventory & XP

**Files:**
- Create: `app/supabase/migrations/20260323120000_inventory.sql`
- Create: `app/supabase/migrations/20260323120100_xp.sql`

- [ ] **Step 1: Create inventory migration**

```sql
-- Items library (campaign-level)
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  type text DEFAULT 'other' CHECK (type IN ('weapon', 'armor', 'magic_item', 'equipment', 'consumable', 'other')),
  rarity text CHECK (rarity IS NULL OR rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),
  cost text,
  stackable boolean DEFAULT false,
  source text DEFAULT 'homebrew' CHECK (source IN ('srd', 'homebrew')),
  srd_slug text,
  item_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_campaign_access" ON items
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_items_campaign ON items(campaign_id);
CREATE INDEX idx_items_name ON items(name);
CREATE UNIQUE INDEX idx_items_srd_slug ON items(campaign_id, srd_slug) WHERE srd_slug IS NOT NULL;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Character inventory
CREATE TABLE character_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  character_id uuid REFERENCES player_characters(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1,
  notes text,
  equipped boolean DEFAULT false
);

ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_inventory_campaign_access" ON character_inventory
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_character_inventory_character ON character_inventory(character_id);

-- Party treasure
CREATE TABLE party_treasure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE party_treasure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "party_treasure_campaign_access" ON party_treasure
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_party_treasure_campaign ON party_treasure(campaign_id);
```

- [ ] **Step 2: Create XP migration**

```sql
ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
```

- [ ] **Step 3: Push migrations**

```bash
cd app && echo "Y" | npx supabase db push
```

- [ ] **Step 4: Update PlayerCharacter type**

In `app/src/lib/types.ts`, add `xp: number` to the PlayerCharacter type (after the `level` field).

- [ ] **Step 5: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add app/supabase/migrations/20260323120000_inventory.sql app/supabase/migrations/20260323120100_xp.sql app/src/lib/types.ts
git commit -m "feat: add inventory tables and xp column with RLS"
```

---

### Task 7: XP Tracking — Static Data & UI

**Files:**
- Create: `app/src/lib/data/xp-thresholds.ts`
- Modify: `app/src/features/characters/PCSheet.tsx`

- [ ] **Step 1: Create XP thresholds static data**

Create `app/src/lib/data/xp-thresholds.ts`:

```typescript
/** D&D 5e XP thresholds per level */
export const XP_THRESHOLDS: Record<number, number> = {
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
}

/** Get XP required for the next level */
export function getNextLevelXP(currentLevel: number): number | null {
  const nextLevel = currentLevel + 1
  return XP_THRESHOLDS[nextLevel] ?? null
}

/** Get XP required for current level (threshold that was crossed to reach this level) */
export function getCurrentLevelXP(currentLevel: number): number {
  return XP_THRESHOLDS[currentLevel] ?? 0
}

/** Calculate progress percentage toward next level */
export function getXPProgress(xp: number, currentLevel: number): number {
  const currentThreshold = getCurrentLevelXP(currentLevel)
  const nextThreshold = getNextLevelXP(currentLevel)
  if (!nextThreshold) return 100 // Max level
  if (xp >= nextThreshold) return 100 // Ready to level up
  const range = nextThreshold - currentThreshold
  const progress = xp - currentThreshold
  return Math.max(0, Math.min(100, (progress / range) * 100))
}
```

- [ ] **Step 2: Add XP section to PCSheet**

Read `app/src/features/characters/PCSheet.tsx`. Find the section after combat stats (AC, HP, speed) and add an XP tracking section.

The implementer should:
1. Import `{ getNextLevelXP, getXPProgress }` from `@/lib/data/xp-thresholds`
2. Add an "Add XP" state: `const [addingXP, setAddingXP] = useState(false)` and `const [xpAmount, setXpAmount] = useState('')`
3. Use the existing `updatePC` mutation (or similar) to update `xp`

Add this section to the PC sheet display:

```tsx
{/* XP Tracking */}
<div className="bg-bg-raised rounded-[--radius-md] p-3">
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] text-text-muted uppercase tracking-wider font-label">Experience</span>
    <Button size="sm" variant="ghost" onClick={() => setAddingXP(!addingXP)}>
      {addingXP ? 'Cancel' : '+ Add XP'}
    </Button>
  </div>

  {addingXP && (
    <div className="flex gap-2 mb-2">
      <input
        type="number"
        value={xpAmount}
        onChange={(e) => setXpAmount(e.target.value)}
        placeholder="XP amount"
        className="flex-1 bg-bg-base rounded-[--radius-sm] border border-border px-2 py-1 text-sm text-text-heading outline-none focus:border-border-active"
      />
      <Button size="sm" onClick={() => {
        const amount = parseInt(xpAmount)
        if (!isNaN(amount) && amount > 0) {
          updatePC.mutate({ id: pc.id, xp: (pc.xp || 0) + amount })
          setXpAmount('')
          setAddingXP(false)
        }
      }}>
        Add
      </Button>
    </div>
  )}

  <div className="flex items-center justify-between text-xs mb-1">
    <span className="text-text-body font-mono">{(pc.xp || 0).toLocaleString()} XP</span>
    <span className="text-text-muted">
      {getNextLevelXP(pc.level) ? `/ ${getNextLevelXP(pc.level)!.toLocaleString()}` : 'Max Level'}
    </span>
  </div>

  {/* Progress bar */}
  <div className="h-2 bg-bg-base rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-500 ${
        getXPProgress(pc.xp || 0, pc.level) >= 100
          ? 'bg-primary animate-pulse'
          : 'bg-primary/70'
      }`}
      style={{ width: `${getXPProgress(pc.xp || 0, pc.level)}%` }}
    />
  </div>

  {getXPProgress(pc.xp || 0, pc.level) >= 100 && (
    <p className="text-xs text-primary-light mt-1 font-medium">Ready to level up!</p>
  )}
</div>
```

Note to implementer: Check the exact mutation name for updating a PC — it might be `useUpdateCharacter` or `useUpdatePC`. Also check if `xp` is accepted in the mutation input type. If the existing update mutation doesn't include `xp`, add it to the mutation's input type.

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/data/xp-thresholds.ts app/src/features/characters/PCSheet.tsx
git commit -m "feat: add XP tracking with progress bar to PC sheet"
```

---

### Task 8: Open5e Item Import Functions

**Files:**
- Modify: `app/src/lib/open5e.ts`

- [ ] **Step 1: Add item types and fetch functions**

Read `app/src/lib/open5e.ts` and append:

```typescript
// ─── Items (Weapons, Armor, Magic Items) ────────────────

export interface Open5eMagicItem {
  slug: string
  name: string
  type: string
  desc: string
  rarity: string
  requires_attunement: string
  document__slug: string
  document__title: string
}

export interface Open5eWeapon {
  slug: string
  name: string
  cost: string
  damage_dice: string
  damage_type: string
  weight: string
  properties: string[]
  weapon_range: string
  document__slug: string
  document__title: string
}

export interface Open5eArmor {
  slug: string
  name: string
  cost: string
  base_ac: number
  plus_max: number | null
  stealth_disadvantage: boolean
  weight: string
  document__slug: string
  document__title: string
}

export async function searchMagicItems(params: {
  search?: string
  limit?: number
}): Promise<{ count: number; results: Open5eMagicItem[] }> {
  const url = new URL(`${BASE_URL}/magicitems/`)
  url.searchParams.set('format', 'json')
  if (params.search) url.searchParams.set('search', params.search)
  url.searchParams.set('limit', String(params.limit ?? 20))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  return res.json()
}

export async function fetchAllMagicItems(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Open5eMagicItem[]> {
  const all: Open5eMagicItem[] = []
  let url: string | null = `${BASE_URL}/magicitems/?format=json&limit=100`

  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
    const data = await res.json()
    all.push(...data.results)
    onProgress?.(all.length, data.count)
    url = data.next
  }

  return all
}

export async function fetchAllWeapons(): Promise<Open5eWeapon[]> {
  const res = await fetch(`${BASE_URL}/weapons/?format=json&limit=100`)
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  const data = await res.json()
  return data.results
}

export async function fetchAllArmor(): Promise<Open5eArmor[]> {
  const res = await fetch(`${BASE_URL}/armor/?format=json&limit=100`)
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  const data = await res.json()
  return data.results
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/open5e.ts
git commit -m "feat: add Open5e item fetch functions for magic items, weapons, armor"
```

---

### Task 9: Inventory Hooks

**Files:**
- Create: `app/src/features/inventory/useItems.ts`
- Create: `app/src/features/inventory/useCharacterInventory.ts`
- Create: `app/src/features/inventory/usePartyTreasure.ts`

- [ ] **Step 1: Create directory and useItems.ts**

```bash
mkdir -p "app/src/features/inventory"
```

Create `app/src/features/inventory/useItems.ts` — CRUD for the items table + SRD bulk import. Follow the same pattern as `app/src/features/quick-reference/useAbilities.ts` (query, create mutation, bulk import with dedup by srd_slug, batch insert in chunks of 50).

Key types:
```typescript
export type Item = {
  id: string
  campaign_id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'magic_item' | 'equipment' | 'consumable' | 'other'
  rarity: string | null
  cost: string | null
  stackable: boolean
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  item_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
```

Hooks: `useItems(campaignId)`, `useCreateItem()`, `useBulkImportItems()`.

The bulk import should fetch magic items, weapons, and armor from Open5e and insert them all.

- [ ] **Step 2: Create useCharacterInventory.ts**

CRUD hooks for `character_inventory` table:
```typescript
export type CharacterInventoryItem = {
  id: string
  item_id: string
  character_id: string
  campaign_id: string
  quantity: number
  notes: string | null
  equipped: boolean
}
```

Hooks: `useCharacterInventory(characterId)`, `useAddToInventory()`, `useUpdateInventoryItem()`, `useRemoveFromInventory()`.

- [ ] **Step 3: Create usePartyTreasure.ts**

CRUD hooks for `party_treasure` table:
```typescript
export type PartyTreasureItem = {
  id: string
  item_id: string | null
  campaign_id: string
  name: string
  quantity: number
  notes: string | null
  created_at: string
}
```

Hooks: `usePartyTreasure(campaignId)`, `useAddToPartyTreasure()`, `useUpdatePartyTreasure()`, `useRemoveFromPartyTreasure()`.

- [ ] **Step 4: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/src/features/inventory/
git commit -m "feat: add inventory, character inventory, and party treasure hooks"
```

---

### Task 10: Item Search Component

**Files:**
- Create: `app/src/features/inventory/ItemSearch.tsx`

Reusable search component that searches campaign items + Open5e SRD. Same pattern as the quick reference search but focused on items only. Used by both CharacterInventory and PartyTreasure.

- [ ] **Step 1: Create ItemSearch component**

A popup search input that shows results from campaign items table and Open5e magic items API. On selecting an item:
- If it's a campaign item, calls `onSelect(item)`
- If it's an SRD item not yet in campaign, imports it first, then calls `onSelect(item)`

Props: `{ campaignId: string; onSelect: (item: Item) => void; onClose: () => void }`

The implementer should follow the pattern from the quick reference search but simplified for items only.

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/inventory/ItemSearch.tsx
git commit -m "feat: add item search component with SRD integration"
```

---

### Task 11: Character Inventory UI

**Files:**
- Create: `app/src/features/inventory/CharacterInventory.tsx`
- Modify: `app/src/features/characters/PCSheet.tsx`

- [ ] **Step 1: Create CharacterInventory component**

A section for the PC sheet showing the character's items with:
- List of items with name, quantity (+/- for stackable), equipped toggle, notes
- "Add Item" button that opens ItemSearch
- Remove button per item

- [ ] **Step 2: Mount on PCSheet**

Import and add `<CharacterInventory characterId={pc.id} campaignId={campaignId} />` to the PC sheet.

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/inventory/CharacterInventory.tsx app/src/features/characters/PCSheet.tsx
git commit -m "feat: add character inventory section to PC sheet"
```

---

### Task 12: Party Treasure UI

**Files:**
- Create: `app/src/features/inventory/PartyTreasure.tsx`
- Modify: `app/src/features/campaigns/CampaignOverview.tsx`

- [ ] **Step 1: Create PartyTreasure component**

A section for the campaign overview showing shared loot:
- List of items with name, quantity, notes
- "Add Item" button (opens ItemSearch) and "Add Gold" quick-add
- Remove/edit buttons
- Gold/currency shown prominently at top

- [ ] **Step 2: Mount on CampaignOverview**

Import and add `<PartyTreasure campaignId={campaignId} />` after the PlotThreads section.

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/inventory/PartyTreasure.tsx app/src/features/campaigns/CampaignOverview.tsx
git commit -m "feat: add party treasure section to campaign overview"
```

---

### Task 13: Build Verification & Manual Testing

- [ ] **Step 1: Full type check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 2: Production build**

```bash
cd app && npx vite build
```

- [ ] **Step 3: Manual testing checklist**

**Play mode removed:**
- Timeline always shows drag handles, edit/delete buttons
- No Prep/Play toggle visible

**Active combatant glow:**
- Start combat in initiative tracker
- Verify amber pulsing glow on current combatant
- Advance turn — glow moves to next combatant
- End combat — glow disappears

**Pin timeline items:**
- Click pin on a scene — appears at top with "Pinned" badge
- Click pin on a different item — replaces the pinned item
- Click pin again — unpins

**Dice roller:**
- Click dice button in session header — drawer slides in from right
- Select dice quantities, click Roll — 3D dice animate
- Results show with total and individual values
- Roll history accumulates
- Close drawer with X

**XP tracking:**
- Open a PC sheet
- Verify XP section with progress bar
- Click "Add XP", enter amount, click Add
- Bar fills proportionally
- When XP exceeds threshold: "Ready to level up!" message

**Inventory:**
- On PC sheet: Add Item, search SRD, add to inventory
- Equip/unequip toggle, quantity +/- for stackable items
- On campaign overview: Party Treasure section
- Add gold, add items, remove items
