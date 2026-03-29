# Custom Spells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add create and edit functionality for homebrew spells, following the established monster create/edit pattern.

**Architecture:** Two new mutation hooks in `useSpells.ts`, a new `SpellCreateForm.tsx` component (matching `MonsterCreateForm` pattern), and integration into `SpellbookPage.tsx` with "Create Spell" button + "Edit" button on homebrew cards. SpellCard display updated to render homebrew spells from top-level columns + `spell_data.desc`/`spell_data.higher_level`.

**Tech Stack:** React 19, TanStack Query mutations, Supabase, Tailwind CSS 4, motion/react (SlideUp)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/features/spellbook/useSpells.ts` (modify) | Add `useCreateSpell()` and `useUpdateSpell()` mutation hooks |
| `src/features/spellbook/SpellCreateForm.tsx` (create) | Create/edit form component for homebrew spells |
| `src/features/spellbook/SpellbookPage.tsx` (modify) | Wire up form, add create button, add edit button, fix SpellCard display |

---

### Task 1: Add Mutation Hooks

**Files:**
- Modify: `src/features/spellbook/useSpells.ts`

- [ ] **Step 1: Add `useCreateSpell()` hook**

Add after the `useDeleteSpell()` function at the end of `useSpells.ts`:

```typescript
export function useCreateSpell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaignId: string
      name: string
      level: number
      school: string
      casting_time: string
      range: string
      duration: string
      concentration: boolean
      ritual: boolean
      components: string
      classes: string[]
      desc: string
      higher_level: string
      notes: string
    }) => {
      const { campaignId, desc, higher_level, ...fields } = input
      const { data, error } = await supabase
        .from('spells')
        .insert({
          campaign_id: campaignId,
          source: 'homebrew',
          srd_slug: null,
          source_book: 'Homebrew',
          spell_data: { desc, higher_level },
          ...fields,
        })
        .select()
        .single()
      if (error) throw error
      return data as Spell
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spells', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Spell created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
```

- [ ] **Step 2: Add `useUpdateSpell()` hook**

Add after `useCreateSpell()`:

```typescript
export function useUpdateSpell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      campaignId: string
      name: string
      level: number
      school: string
      casting_time: string
      range: string
      duration: string
      concentration: boolean
      ritual: boolean
      components: string
      classes: string[]
      desc: string
      higher_level: string
      notes: string
    }) => {
      const { id, campaignId, desc, higher_level, ...fields } = input
      const { data, error } = await supabase
        .from('spells')
        .update({
          spell_data: { desc, higher_level },
          ...fields,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Spell
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spells', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Spell updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: No errors related to useSpells.ts

- [ ] **Step 4: Commit**

```bash
git add app/src/features/spellbook/useSpells.ts
git commit -m "feat(spellbook): add useCreateSpell and useUpdateSpell mutation hooks"
```

---

### Task 2: Create SpellCreateForm Component

**Files:**
- Create: `src/features/spellbook/SpellCreateForm.tsx`

- [ ] **Step 1: Create the form component**

Create `app/src/features/spellbook/SpellCreateForm.tsx`:

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SlideUp } from '@/components/motion'
import { SPELL_SCHOOLS, SPELL_CLASSES } from '@/lib/types'
import type { Spell } from '@/lib/types'
import { useCreateSpell, useUpdateSpell } from './useSpells'

export function SpellCreateForm({
  campaignId,
  spell,
  onClose,
}: {
  campaignId: string
  spell?: Spell
  onClose: () => void
}) {
  const isEdit = !!spell
  const spellData = (spell?.spell_data ?? {}) as Record<string, unknown>

  const [name, setName] = useState(spell?.name ?? '')
  const [level, setLevel] = useState(spell?.level ?? 0)
  const [school, setSchool] = useState(spell?.school ?? '')
  const [castingTime, setCastingTime] = useState(spell?.casting_time ?? '')
  const [range, setRange] = useState(spell?.range ?? '')
  const [duration, setDuration] = useState(spell?.duration ?? '')
  const [components, setComponents] = useState(spell?.components ?? '')
  const [concentration, setConcentration] = useState(spell?.concentration ?? false)
  const [ritual, setRitual] = useState(spell?.ritual ?? false)
  const [classes, setClasses] = useState<string[]>(spell?.classes ?? [])
  const [desc, setDesc] = useState((spellData.desc as string) ?? '')
  const [higherLevel, setHigherLevel] = useState((spellData.higher_level as string) ?? '')
  const [notes, setNotes] = useState(spell?.notes ?? '')

  const createSpell = useCreateSpell()
  const updateSpell = useUpdateSpell()

  function toggleClass(cls: string) {
    setClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      campaignId,
      name: name.trim(),
      level,
      school,
      casting_time: castingTime,
      range,
      duration,
      concentration,
      ritual,
      components,
      classes,
      desc,
      higher_level: higherLevel,
      notes,
    }

    if (isEdit && spell) {
      updateSpell.mutate({ ...payload, id: spell.id }, { onSuccess: () => onClose() })
    } else {
      createSpell.mutate(payload, { onSuccess: () => onClose() })
    }
  }

  const isPending = createSpell.isPending || updateSpell.isPending

  const selectClass =
    'w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30'

  return (
    <SlideUp>
      <form onSubmit={handleSubmit} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg text-text-heading">
            {isEdit ? 'Edit Spell' : 'Create Custom Spell'}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Name + Level + School */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0}>Cantrip</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">School</label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className={selectClass}
            >
              <option value="">—</option>
              {SPELL_SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Casting Mechanics */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Casting Time" value={castingTime} onChange={(e) => setCastingTime(e.target.value)} placeholder="e.g. 1 action" />
          <Input label="Range" value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. 120 feet" />
          <Input label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. Instantaneous" />
          <Input label="Components" value={components} onChange={(e) => setComponents(e.target.value)} placeholder="e.g. V, S, M (bat guano)" />
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-text-body cursor-pointer">
            <input
              type="checkbox"
              checked={concentration}
              onChange={(e) => setConcentration(e.target.checked)}
              className="rounded border-border"
            />
            Concentration
          </label>
          <label className="flex items-center gap-2 text-sm text-text-body cursor-pointer">
            <input
              type="checkbox"
              checked={ritual}
              onChange={(e) => setRitual(e.target.checked)}
              className="rounded border-border"
            />
            Ritual
          </label>
        </div>

        {/* Classes */}
        <div>
          <label className="text-sm text-text-secondary font-medium block mb-2">Classes</label>
          <div className="flex flex-wrap gap-2">
            {SPELL_CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => toggleClass(cls)}
                className={`px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${
                  classes.includes(cls)
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-text-muted hover:text-text-body hover:border-border-active'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="What does this spell do?"
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
          />
        </div>

        {/* At Higher Levels */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">At Higher Levels</label>
          <textarea
            value={higherLevel}
            onChange={(e) => setHigherLevel(e.target.value)}
            rows={2}
            placeholder="Optional: how does this spell scale?"
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
          />
        </div>

        {/* GM Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">GM Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Private notes about this spell..."
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? 'Saving...' : isEdit ? 'Save Spell' : 'Create Spell'}
          </Button>
        </div>
      </form>
    </SlideUp>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/features/spellbook/SpellCreateForm.tsx
git commit -m "feat(spellbook): add SpellCreateForm component for homebrew spells"
```

---

### Task 3: Integrate Form into SpellbookPage

**Files:**
- Modify: `src/features/spellbook/SpellbookPage.tsx`

- [ ] **Step 1: Add imports and state**

Add to the imports at the top of `SpellbookPage.tsx`:

```typescript
import { SpellCreateForm } from './SpellCreateForm'
import { GiSparkles } from '@/components/ui/icons'
```

Note: `GiSparkles` is already imported. Only add `SpellCreateForm`.

In the `SpellLibrary` component, add two state variables after the existing state declarations (after `const [importProgress, setImportProgress] = useState<string | null>(null)`):

```typescript
const [showCreateForm, setShowCreateForm] = useState(false)
const [editingSpell, setEditingSpell] = useState<Spell | null>(null)
```

- [ ] **Step 2: Add form rendering guard**

Add early return in `SpellLibrary`, before the existing return statement (after the `groupedByLevel` computation, before `return (<div>`):

```typescript
if (showCreateForm || editingSpell) {
  return (
    <SpellCreateForm
      campaignId={campaignId}
      spell={editingSpell ?? undefined}
      onClose={() => { setShowCreateForm(false); setEditingSpell(null) }}
    />
  )
}
```

- [ ] **Step 3: Add "Create Spell" button to toolbar**

In the toolbar `<div className="flex items-center gap-3 mb-4">`, add a new button before the "Import All SRD" button:

```typescript
<Button
  size="sm"
  variant="primary"
  onClick={() => setShowCreateForm(true)}
>
  <GiSparkles className="inline" size={16} /> Create Spell
</Button>
```

- [ ] **Step 4: Add `onEdit` prop to SpellCard and wire it up**

Update the `SpellCard` component's type signature to accept `onEdit`:

```typescript
function SpellCard({ spell, expanded, onToggle, onDelete, onEdit, selectMode, selected, onSelect }: {
  spell: Spell
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  selectMode?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
```

In the `SpellCard` rendered inside the level groups, add the `onEdit` prop:

```typescript
<SpellCard
  spell={spell}
  expanded={expandedId === spell.id}
  onToggle={() => setExpandedId(expandedId === spell.id ? null : spell.id)}
  onDelete={() => deleteSpell.mutate({ id: spell.id, campaignId })}
  onEdit={() => setEditingSpell(spell)}
  selectMode={active}
  selected={selectedIds.has(spell.id)}
  onSelect={() => toggle(spell.id)}
/>
```

- [ ] **Step 5: Add Edit button to SpellCard expanded view**

In SpellCard's expanded section, update the bottom row (the `<div className="flex items-center justify-between pt-1">`) to include an Edit button for homebrew spells:

Replace the current bottom row:
```typescript
<div className="flex items-center justify-between pt-1">
  <span className="text-xs text-text-muted">{data.dnd_class}</span>
  <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">
    Remove
  </Button>
</div>
```

With:
```typescript
<div className="flex items-center justify-between pt-1">
  <span className="text-xs text-text-muted">{spell.classes.join(', ') || (data as Record<string, unknown>)?.dnd_class as string}</span>
  <div className="flex gap-1">
    {spell.source === 'homebrew' && (
      <Button size="sm" variant="ghost" onClick={onEdit}>
        Edit
      </Button>
    )}
    <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">
      Remove
    </Button>
  </div>
</div>
```

- [ ] **Step 6: Fix SpellCard expanded view for homebrew spells**

Currently the expanded section is gated by `{expanded && data && (`. Homebrew spells have `spell_data: { desc, higher_level }` — not a full `Open5eSpell` — so `data` will be truthy but missing SRD-specific fields.

Replace the entire expanded block:

```typescript
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
```

With:

```typescript
{expanded && (
  <div className="px-3 pb-3 border-t border-border pt-3 space-y-2 text-sm">
    <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
      <div><span className="text-text-muted">Casting Time:</span> {spell.casting_time ?? (data as Record<string, unknown>)?.casting_time as string}</div>
      <div><span className="text-text-muted">Range:</span> {spell.range ?? (data as Record<string, unknown>)?.range as string}</div>
      <div><span className="text-text-muted">Duration:</span> {spell.duration ?? (data as Record<string, unknown>)?.duration as string}</div>
      <div><span className="text-text-muted">Components:</span> {spell.components}</div>
    </div>
    {(data as Record<string, unknown>)?.desc && (
      <p className="text-text-body text-sm whitespace-pre-line">{(data as Record<string, unknown>).desc as string}</p>
    )}
    {(data as Record<string, unknown>)?.higher_level && (
      <p className="text-text-secondary text-sm">
        <span className="text-text-muted font-medium">At Higher Levels:</span> {(data as Record<string, unknown>).higher_level as string}
      </p>
    )}
    <div className="flex items-center justify-between pt-1">
      <span className="text-xs text-text-muted">{spell.classes.join(', ') || (data as Record<string, unknown>)?.dnd_class as string}</span>
      <div className="flex gap-1">
        {spell.source === 'homebrew' && (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">
          Remove
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add app/src/features/spellbook/SpellbookPage.tsx
git commit -m "feat(spellbook): integrate create/edit form and fix homebrew display"
```

---

### Task 4: Manual Smoke Test

- [ ] **Step 1: Start dev server**

Run: `cd app && npm run dev`

- [ ] **Step 2: Test create flow**

1. Navigate to a campaign's Spellbook page
2. Click "Create Spell" button — form should replace library with slide-up animation
3. Fill in: Name "Frost Nova", Level 3, School Evocation, Casting Time "1 action", Range "Self (20-foot radius)", Duration "Instantaneous", Components "V, S", toggle Concentration off, toggle Wizard and Sorcerer classes, add description text
4. Click "Create Spell" — should see success toast, return to library
5. New spell should appear under Level 3 with "Homebrew" source badge

- [ ] **Step 3: Test edit flow**

1. Find the homebrew spell just created
2. Expand it — should show all entered fields correctly
3. Click "Edit" button — form should appear pre-filled with all values
4. Change the name to "Frost Nova II", click "Save Spell"
5. Should see success toast, return to library with updated name

- [ ] **Step 4: Test SRD spells unaffected**

1. Expand an SRD spell — should still display all fields correctly
2. Verify no "Edit" button appears on SRD spells
3. Verify the expanded details still work (casting time, range, description, classes)

- [ ] **Step 5: Verify build passes**

Run: `cd app && npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(spellbook): address smoke test issues"
```
