# DM's Cheat Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global DM's Cheat Sheet modal with tabbed sections for skill checks, conditions, cover rules, DC guidelines, travel pace, and common item costs.

**Architecture:** New feature module at `features/cheat-sheet/` with a Zustand store for open/close/tab state, a static data file, and a modal component. Integrates into `App.tsx` (keyboard shortcut + render), `SessionPage.tsx` (button), and `CommandPalette.tsx` (searchable action).

**Tech Stack:** React, Zustand, motion/react, Tailwind CSS, game-icons

---

### Task 1: Zustand Store

**Files:**
- Create: `app/src/lib/cheat-sheet.ts`

- [ ] **Step 1: Create the Zustand store**

Create `app/src/lib/cheat-sheet.ts`:

```typescript
import { create } from 'zustand'

export type CheatSheetTab = 'skills' | 'conditions' | 'cover' | 'dcs' | 'travel' | 'items'

interface CheatSheetState {
  isOpen: boolean
  activeTab: CheatSheetTab
  open: () => void
  close: () => void
  setTab: (tab: CheatSheetTab) => void
}

export const useCheatSheet = create<CheatSheetState>((set) => ({
  isOpen: false,
  activeTab: 'skills',
  open: () => set({ isOpen: true, activeTab: 'skills' }),
  close: () => set({ isOpen: false }),
  setTab: (activeTab) => set({ activeTab }),
}))
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: No errors related to `cheat-sheet.ts`

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/cheat-sheet.ts
git commit -m "feat(cheat-sheet): add Zustand store for cheat sheet state"
```

---

### Task 2: Static Data File

**Files:**
- Create: `app/src/features/cheat-sheet/cheatSheetData.ts`

- [ ] **Step 1: Create the data file**

Create `app/src/features/cheat-sheet/cheatSheetData.ts`:

```typescript
export interface SkillEntry {
  ability: string
  abilityShort: string
  skills: string[]
}

export interface ConditionEntry {
  name: string
  description: string
}

export interface ExhaustionLevel {
  level: number
  effect: string
}

export interface CoverEntry {
  type: string
  bonus: string
  description: string
}

export interface DCEntry {
  difficulty: string
  dc: number
}

export interface TravelPaceEntry {
  pace: string
  perMinute: string
  perHour: string
  perDay: string
  effect: string
}

export interface ItemEntry {
  name: string
  cost: string
}

export interface ItemGroup {
  category: string
  items: ItemEntry[]
}

export const SKILL_GROUPS: SkillEntry[] = [
  { ability: 'Strength', abilityShort: 'STR', skills: ['Athletics'] },
  { ability: 'Dexterity', abilityShort: 'DEX', skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'] },
  { ability: 'Constitution', abilityShort: 'CON', skills: [] },
  { ability: 'Intelligence', abilityShort: 'INT', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'] },
  { ability: 'Wisdom', abilityShort: 'WIS', skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'] },
  { ability: 'Charisma', abilityShort: 'CHA', skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'] },
]

export const CONDITIONS: ConditionEntry[] = [
  { name: 'Blinded', description: "Can't see. Auto-fail sight checks. Attacks have disadvantage; attacks against have advantage." },
  { name: 'Charmed', description: "Can't attack charmer. Charmer has advantage on social checks." },
  { name: 'Deafened', description: "Can't hear. Auto-fail hearing checks." },
  { name: 'Frightened', description: "Disadvantage on checks/attacks while source is in sight. Can't willingly move closer." },
  { name: 'Grappled', description: 'Speed is 0. Ends if grappler incapacitated or effect moves target out of reach.' },
  { name: 'Incapacitated', description: "Can't take actions or reactions." },
  { name: 'Invisible', description: 'Impossible to see without magic/special sense. Advantage on attacks; attacks against have disadvantage.' },
  { name: 'Paralyzed', description: "Incapacitated, can't move or speak. Auto-fail STR/DEX saves. Attacks have advantage; melee hits are auto-crits." },
  { name: 'Petrified', description: "Turned to stone. Weight x10. Incapacitated, can't move/speak. Resistance to all damage. Immune to poison/disease." },
  { name: 'Poisoned', description: 'Disadvantage on attacks and ability checks.' },
  { name: 'Prone', description: 'Disadvantage on attacks. Melee attacks against have advantage; ranged against have disadvantage. Half movement to stand.' },
  { name: 'Restrained', description: 'Speed is 0. Attacks have disadvantage; attacks against have advantage. Disadvantage on DEX saves.' },
  { name: 'Stunned', description: "Incapacitated, can't move, can only speak falteringly. Auto-fail STR/DEX saves. Attacks against have advantage." },
  { name: 'Unconscious', description: "Incapacitated, can't move or speak, drops held items, falls prone. Auto-fail STR/DEX saves. Attacks have advantage; melee hits are auto-crits." },
]

export const EXHAUSTION_LEVELS: ExhaustionLevel[] = [
  { level: 1, effect: 'Disadvantage on ability checks' },
  { level: 2, effect: 'Speed halved' },
  { level: 3, effect: 'Disadvantage on attacks and saves' },
  { level: 4, effect: 'HP max halved' },
  { level: 5, effect: 'Speed reduced to 0' },
  { level: 6, effect: 'Death' },
]

export const COVER_RULES: CoverEntry[] = [
  { type: 'Half', bonus: '+2 AC & DEX saves', description: 'Low wall, furniture, another creature' },
  { type: 'Three-Quarters', bonus: '+5 AC & DEX saves', description: 'Portcullis, arrow slit' },
  { type: 'Full', bonus: "Can't be targeted", description: 'Completely concealed by obstacle' },
]

export const DC_GUIDELINES: DCEntry[] = [
  { difficulty: 'Very Easy', dc: 5 },
  { difficulty: 'Easy', dc: 10 },
  { difficulty: 'Medium', dc: 15 },
  { difficulty: 'Hard', dc: 20 },
  { difficulty: 'Very Hard', dc: 25 },
  { difficulty: 'Nearly Impossible', dc: 30 },
]

export const TRAVEL_PACE: TravelPaceEntry[] = [
  { pace: 'Fast', perMinute: '400 ft', perHour: '4 miles', perDay: '30 miles', effect: '-5 passive Perception' },
  { pace: 'Normal', perMinute: '300 ft', perHour: '3 miles', perDay: '24 miles', effect: '—' },
  { pace: 'Slow', perMinute: '200 ft', perHour: '2 miles', perDay: '18 miles', effect: 'Can use Stealth' },
]

export const COMMON_ITEMS: ItemGroup[] = [
  {
    category: 'Adventuring Gear',
    items: [
      { name: 'Rope (50 ft)', cost: '1 gp' },
      { name: 'Torch (10)', cost: '1 cp each' },
      { name: 'Rations (1 day)', cost: '5 sp' },
      { name: 'Waterskin', cost: '2 sp' },
      { name: 'Bedroll', cost: '1 gp' },
      { name: 'Tinderbox', cost: '5 sp' },
      { name: 'Piton (10)', cost: '5 cp each' },
      { name: 'Grappling Hook', cost: '2 gp' },
    ],
  },
  {
    category: 'Potions',
    items: [
      { name: 'Healing (2d4+2)', cost: '50 gp' },
      { name: 'Greater Healing (4d4+4)', cost: '100 gp' },
    ],
  },
  {
    category: 'Services',
    items: [
      { name: 'Ale (mug)', cost: '4 cp' },
      { name: 'Meal (modest)', cost: '3 sp' },
      { name: 'Inn stay (modest)', cost: '5 sp' },
      { name: 'Inn stay (comfortable)', cost: '8 sp' },
      { name: 'Messenger (per mile)', cost: '2 cp' },
    ],
  },
]

export const TAB_CONFIG = [
  { id: 'skills' as const, label: 'Skills' },
  { id: 'conditions' as const, label: 'Conditions' },
  { id: 'cover' as const, label: 'Cover' },
  { id: 'dcs' as const, label: 'DCs' },
  { id: 'travel' as const, label: 'Travel' },
  { id: 'items' as const, label: 'Items' },
]
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/features/cheat-sheet/cheatSheetData.ts
git commit -m "feat(cheat-sheet): add static D&D reference data"
```

---

### Task 3: CheatSheet Modal Component

**Files:**
- Create: `app/src/features/cheat-sheet/CheatSheet.tsx`
- Modify: `app/src/components/ui/icons.ts` (add `GiBookPile` icon)

Reference files (read these before implementing):
- `app/src/features/quick-reference/QuickReference.tsx` — modal pattern to follow
- `app/src/components/ui/icons.ts` — icon barrel (add new icon here)
- `app/src/hooks/useIsMobile.ts` — mobile detection hook

- [ ] **Step 1: Add the cheat sheet icon to the barrel file**

In `app/src/components/ui/icons.ts`, add at the end before the closing comment block:

```typescript
// Cheat sheet
export { GiBookPile } from 'react-icons/gi'          // 📚 DM's cheat sheet
```

- [ ] **Step 2: Verify the icon exists in react-icons**

Run: `cd app && node -e "const { GiBookPile } = require('react-icons/gi'); console.log(typeof GiBookPile)"`

Expected: `function`

If `GiBookPile` doesn't exist, use `GiOpenBook` which is already in the barrel file — skip adding the icon and use `GiOpenBook` in the component instead.

- [ ] **Step 3: Create the CheatSheet component**

Create `app/src/features/cheat-sheet/CheatSheet.tsx`:

```tsx
import { useCallback } from 'react'
import { AnimatePresence, motion, ScaleIn } from '@/components/motion'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useCheatSheet } from '@/lib/cheat-sheet'
import type { CheatSheetTab } from '@/lib/cheat-sheet'
import {
  SKILL_GROUPS,
  CONDITIONS,
  EXHAUSTION_LEVELS,
  COVER_RULES,
  DC_GUIDELINES,
  TRAVEL_PACE,
  COMMON_ITEMS,
  TAB_CONFIG,
} from './cheatSheetData'

function SkillsTab() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILL_GROUPS.map((group) => (
          <div key={group.abilityShort} className="bg-bg-raised rounded-[--radius-md] p-3">
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-primary/15 text-primary mb-2">
              {group.abilityShort}
            </span>
            {group.skills.length > 0 ? (
              <ul className="space-y-1">
                {group.skills.map((skill) => (
                  <li key={skill} className="text-sm text-text-body">{skill}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted italic">No skills — CON saves only</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-3">Contested checks: both sides roll, highest wins.</p>
    </div>
  )
}

function ConditionsTab() {
  return (
    <div>
      <div className="space-y-2">
        {CONDITIONS.map((c) => (
          <div key={c.name} className="bg-bg-raised rounded-[--radius-md] px-3 py-2">
            <span className="text-sm font-medium text-text-heading">{c.name}</span>
            <span className="text-sm text-text-muted"> — {c.description}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-bg-raised rounded-[--radius-md] p-3">
        <p className="text-sm font-medium text-text-heading mb-2">Exhaustion</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted text-xs">
              <th className="pb-1 pr-4">Level</th>
              <th className="pb-1">Effect</th>
            </tr>
          </thead>
          <tbody>
            {EXHAUSTION_LEVELS.map((e) => (
              <tr key={e.level} className="border-t border-border/50">
                <td className="py-1 pr-4 font-mono text-primary">{e.level}</td>
                <td className="py-1 text-text-body">{e.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-text-muted mt-2">Effects are cumulative.</p>
      </div>
    </div>
  )
}

function CoverTab() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-muted text-xs">
          <th className="pb-2 pr-4">Type</th>
          <th className="pb-2 pr-4">Bonus</th>
          <th className="pb-2">Example</th>
        </tr>
      </thead>
      <tbody>
        {COVER_RULES.map((c) => (
          <tr key={c.type} className="border-t border-border/50">
            <td className="py-2 pr-4 font-medium text-text-heading">{c.type}</td>
            <td className="py-2 pr-4 text-primary font-mono">{c.bonus}</td>
            <td className="py-2 text-text-muted">{c.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DCsTab() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-muted text-xs">
          <th className="pb-2 pr-4">Difficulty</th>
          <th className="pb-2">DC</th>
        </tr>
      </thead>
      <tbody>
        {DC_GUIDELINES.map((d) => (
          <tr key={d.dc} className="border-t border-border/50">
            <td className="py-2 pr-4 text-text-heading">{d.difficulty}</td>
            <td className="py-2 font-mono text-primary font-bold text-lg">{d.dc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TravelTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted text-xs">
            <th className="pb-2 pr-3">Pace</th>
            <th className="pb-2 pr-3">/ Min</th>
            <th className="pb-2 pr-3">/ Hour</th>
            <th className="pb-2 pr-3">/ Day</th>
            <th className="pb-2">Effect</th>
          </tr>
        </thead>
        <tbody>
          {TRAVEL_PACE.map((t) => (
            <tr key={t.pace} className="border-t border-border/50">
              <td className="py-2 pr-3 font-medium text-text-heading">{t.pace}</td>
              <td className="py-2 pr-3 font-mono text-text-body">{t.perMinute}</td>
              <td className="py-2 pr-3 font-mono text-text-body">{t.perHour}</td>
              <td className="py-2 pr-3 font-mono text-text-body">{t.perDay}</td>
              <td className="py-2 text-text-muted">{t.effect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ItemsTab() {
  return (
    <div className="space-y-4">
      {COMMON_ITEMS.map((group) => (
        <div key={group.category}>
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 font-label">
            {group.category}
          </h4>
          <div className="bg-bg-raised rounded-[--radius-md] overflow-hidden">
            {group.items.map((item, i) => (
              <div
                key={item.name}
                className={`flex items-center justify-between px-3 py-1.5 text-sm ${
                  i > 0 ? 'border-t border-border/50' : ''
                }`}
              >
                <span className="text-text-body">{item.name}</span>
                <span className="font-mono text-primary text-xs">{item.cost}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TAB_CONTENT: Record<CheatSheetTab, () => JSX.Element> = {
  skills: SkillsTab,
  conditions: ConditionsTab,
  cover: CoverTab,
  dcs: DCsTab,
  travel: TravelTab,
  items: ItemsTab,
}

export function CheatSheet() {
  const { isOpen, activeTab, close, setTab } = useCheatSheet()
  const isMobile = useIsMobile()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [close],
  )

  const ActiveContent = TAB_CONTENT[activeTab]

  const innerContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-heading text-text-heading">DM's Cheat Sheet</h2>
        {isMobile ? (
          <button
            onClick={close}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-body hover:bg-bg-raised transition-colors cursor-pointer"
            aria-label="Close cheat sheet"
          >
            ✕
          </button>
        ) : (
          <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
            ESC
          </kbd>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border px-2 gap-1" role="tablist">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`px-3 py-2 text-sm whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary font-medium'
                : 'text-text-muted hover:text-text-body'
            }`}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`overflow-y-auto p-4 ${isMobile ? 'flex-1' : 'max-h-[60vh]'}`}>
        <ActiveContent />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
        <span>esc close</span>
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium">
          {isMobile ? 'ESC' : '\u2318L'}
        </kbd>
      </div>
    </>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          {isMobile ? (
            <motion.div
              className="absolute inset-0 bg-bg-base flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {innerContent}
            </motion.div>
          ) : (
            <div className="flex items-start justify-center pt-[10vh]">
              <ScaleIn className="relative max-w-[700px] w-full mx-4">
                <div className="bg-bg-base rounded-xl border border-border shadow-lg overflow-hidden">
                  {innerContent}
                </div>
              </ScaleIn>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ui/icons.ts app/src/features/cheat-sheet/CheatSheet.tsx
git commit -m "feat(cheat-sheet): add modal component with tabbed reference content"
```

---

### Task 4: Wire Into App.tsx (Keyboard Shortcut + Render)

**Files:**
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Add the cheat sheet to App.tsx**

Add these imports to the top of `app/src/App.tsx`:

```typescript
import { CheatSheet } from '@/features/cheat-sheet/CheatSheet'
import { useCheatSheet } from '@/lib/cheat-sheet'
```

Add the `Cmd+L` handler inside the existing `handleKeyDown` function, after the `Cmd+J` handler (around line 33):

```typescript
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        useCheatSheet.getState().open()
      }
```

Add `<CheatSheet />` in the return JSX, right after `<QuickReference />` (around line 75):

```tsx
      <CheatSheet />
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Manual test**

Run: `cd app && npm run dev`

1. Open the app in browser
2. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows) — cheat sheet modal should open
3. Click through all 6 tabs — each should display content
4. Press `Esc` — modal should close
5. Click backdrop — modal should close
6. Open on mobile viewport — should show as bottom sheet with X close button

- [ ] **Step 4: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(cheat-sheet): wire keyboard shortcut and render in App"
```

---

### Task 5: Session Page Button

**Files:**
- Modify: `app/src/features/sessions/SessionPage.tsx`

- [ ] **Step 1: Add the cheat sheet button to SessionPage**

Add imports at the top of `app/src/features/sessions/SessionPage.tsx`:

```typescript
import { GiOpenBook } from '@/components/ui/icons'
import { useCheatSheet } from '@/lib/cheat-sheet'
```

Note: If `GiBookPile` was successfully added in Task 3, use that instead of `GiOpenBook`.

Add a new button in the header toolbar `<div className="flex items-center gap-2">` section, before the Dice button (around line 82):

```tsx
            <Button
              size="sm"
              variant="secondary"
              onClick={() => useCheatSheet.getState().open()}
            >
              <GameIcon icon={GiOpenBook} size="sm" /> Cheat Sheet
            </Button>
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Manual test**

1. Navigate to any session page
2. The "Cheat Sheet" button should appear in the toolbar next to Dice and Initiative
3. Clicking it should open the cheat sheet modal

- [ ] **Step 4: Commit**

```bash
git add app/src/features/sessions/SessionPage.tsx
git commit -m "feat(cheat-sheet): add button to session page toolbar"
```

---

### Task 6: Command Palette Integration

**Files:**
- Modify: `app/src/components/ui/CommandPalette.tsx`

- [ ] **Step 1: Add cheat sheet as a searchable action**

In `app/src/components/ui/CommandPalette.tsx`, add an import:

```typescript
import { GiOpenBook } from '@/components/ui/icons'
import { useCheatSheet } from '@/lib/cheat-sheet'
```

Note: If `GiBookPile` was successfully added in Task 3, use that instead of `GiOpenBook`.

After the existing `showTourAction` variable (around line 43), add:

```typescript
  const showCheatSheetAction = query.length >= 2 &&
    ['cheat', 'cheat sheet', 'dm', 'reference', 'rules'].some(k => k.startsWith(queryLower))
```

In the results `<div>`, after the existing tour action block (the `{showTourAction && (...)}` block around line 129-146), add:

```tsx
        {showCheatSheetAction && (
          <div className="py-2">
            <div className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
              Actions
            </div>
            <button
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-bg-raised cursor-pointer"
              onClick={() => {
                useCheatSheet.getState().open()
                close()
              }}
            >
              <GameIcon icon={GiOpenBook} size="sm" />
              <span className="text-text-heading text-sm font-medium">DM's Cheat Sheet</span>
              <span className="text-text-muted text-xs">Rules quick reference</span>
            </button>
          </div>
        )}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Manual test**

1. Press `Cmd+K` to open Command Palette
2. Type "cheat" — "DM's Cheat Sheet" action should appear
3. Type "dm" — same action should appear
4. Click the action — Command Palette should close and Cheat Sheet should open

- [ ] **Step 4: Commit**

```bash
git add app/src/components/ui/CommandPalette.tsx
git commit -m "feat(cheat-sheet): add to command palette search actions"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Type check the full project**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Build check**

Run: `cd app && npx vite build`
Expected: Build completes with no errors

- [ ] **Step 3: Full manual test**

Test all three access methods:
1. `Cmd+L` / `Ctrl+L` keyboard shortcut — opens modal from any page
2. Session page "Cheat Sheet" button — opens modal
3. Command Palette — type "cheat" or "dm", click action

Test all 6 tabs have correct content:
1. Skills — 6 ability groups, 18 skills total, contested checks note
2. Conditions — 15 conditions + exhaustion table with cumulative note
3. Cover — 3 rows (half, three-quarters, full)
4. DCs — 6 rows (5 through 30)
5. Travel — 3 rows (fast, normal, slow)
6. Items — 3 groups (gear, potions, services)

Test mobile:
1. Resize to mobile viewport
2. Open cheat sheet — should be bottom sheet
3. Tabs should scroll horizontally
4. X button should close
5. Session page button should be visible

- [ ] **Step 4: Commit any fixes if needed**
