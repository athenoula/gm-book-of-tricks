# Handout Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a handout creation system with 8 templates, wax seal builder, font customisation, live preview, draggable seal positioning, PNG export, and timeline integration.

**Architecture:** New `handouts` feature module following existing patterns (feature hook + page component + Supabase table). Editor uses split-panel layout (form left, preview right). Templates are React components sharing a common parchment base. PNG export via `html-to-image`. Timeline integration adds `'handout'` block type to existing system.

**Tech Stack:** React 19, TanStack Query, Supabase (PostgreSQL + RLS + Storage), Tailwind CSS 4, motion/react, html-to-image, Google Fonts (handwriting/calligraphy)

---

## File Structure

```
src/features/handouts/
├── useHandouts.ts              # TanStack Query hooks (CRUD)
├── HandoutsPage.tsx            # Grid view of handouts + create flow
├── HandoutEditor.tsx           # Split-panel editor (form + preview)
├── HandoutPreview.tsx          # Live preview renderer
├── HandoutSnapshot.tsx         # Timeline block snapshot renderer
├── WaxSeal.tsx                 # Seal component (built + uploaded)
├── SealBuilder.tsx             # Icon picker, colour, shape, ring text controls
├── IconPickerModal.tsx         # Game-icons grid modal with search
├── templates/
│   ├── index.ts                # Template registry + types
│   ├── ParchmentBase.tsx       # Shared parchment background + texture
│   ├── ScrollTemplate.tsx      # Scroll / Letter
│   ├── WantedTemplate.tsx      # Wanted Poster
│   ├── DecreeTemplate.tsx      # Royal Decree
│   ├── MapNoteTemplate.tsx     # Map Note / Treasure Map
│   ├── TavernTemplate.tsx      # Tavern Menu / Shop Sign
│   ├── BroadsheetTemplate.tsx  # Broadsheet / Newspaper
│   ├── InvitationTemplate.tsx  # Invitation / Card
│   └── BlankTemplate.tsx       # Blank Parchment
```

**Modified files:**
- `src/lib/types.ts` — add `Handout` type
- `src/components/ui/icons.ts` — already has `GiQuillInk`
- `src/components/layout/Sidebar.tsx` — add Handouts nav item
- `src/routes/router.tsx` — add `/handouts` route
- `src/features/timeline/useTimelineBlocks.ts` — add `'handout'` to `BlockType`
- `src/features/timeline/TimelineBlockCard.tsx` — add handout rendering
- `src/features/timeline/ContentDrawer.tsx` — add Handouts tab
- `app/supabase/migrations/` — new migration file

---

### Task 1: Database Migration

**Files:**
- Create: `app/supabase/migrations/20260328120000_handouts.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Handouts (campaign-level)
CREATE TABLE handouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template text NOT NULL CHECK (template IN ('scroll', 'wanted', 'decree', 'map_note', 'tavern', 'broadsheet', 'invitation', 'blank')),
  content jsonb NOT NULL DEFAULT '{}',
  style jsonb NOT NULL DEFAULT '{}',
  seal jsonb,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE handouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handouts_campaign_access" ON handouts
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_handouts_campaign ON handouts(campaign_id);
CREATE TRIGGER update_handouts_updated_at BEFORE UPDATE ON handouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add 'handout' to timeline block_type check constraint
ALTER TABLE timeline_blocks DROP CONSTRAINT IF EXISTS timeline_blocks_block_type_check;
ALTER TABLE timeline_blocks ADD CONSTRAINT timeline_blocks_block_type_check
  CHECK (block_type IN ('scene', 'note', 'monster', 'npc', 'spell', 'location', 'battle', 'handout'));
```

- [ ] **Step 2: Push migration to Supabase**

Run: `cd app && echo "Y" | npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add app/supabase/migrations/20260328120000_handouts.sql
git commit -m "feat(handouts): add handouts table and timeline block type"
```

---

### Task 2: Types & Icon

**Files:**
- Modify: `app/src/lib/types.ts`
- Modify: `app/src/features/timeline/useTimelineBlocks.ts`

- [ ] **Step 1: Add Handout type to types.ts**

Add at the end of the entity types section (after the `Spell` type, before `GAME_SYSTEMS`):

```typescript
export type HandoutTemplate = 'scroll' | 'wanted' | 'decree' | 'map_note' | 'tavern' | 'broadsheet' | 'invitation' | 'blank'

export type HandoutSeal = {
  type: 'built'
  icon: string
  ring_text: string
  colour: string
  shape: 'round' | 'shield' | 'oval'
  position: { x: number; y: number }
} | {
  type: 'uploaded'
  custom_image_url: string
  position: { x: number; y: number }
}

export type Handout = {
  id: string
  campaign_id: string
  name: string
  template: HandoutTemplate
  content: Record<string, unknown>
  style: { font_family?: string; font_size?: number; text_align?: string }
  seal: HandoutSeal | null
  image_url: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Update BlockType in useTimelineBlocks.ts**

Change line 5:
```typescript
export type BlockType = 'scene' | 'note' | 'monster' | 'npc' | 'spell' | 'location' | 'battle' | 'handout'
```

- [ ] **Step 3: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/types.ts app/src/features/timeline/useTimelineBlocks.ts
git commit -m "feat(handouts): add Handout types and BlockType update"
```

---

### Task 3: Data Hooks

**Files:**
- Create: `app/src/features/handouts/useHandouts.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type { Handout, HandoutTemplate, HandoutSeal } from '@/lib/types'

export function useHandouts(campaignId: string) {
  return useQuery({
    queryKey: ['handouts', campaignId],
    queryFn: async (): Promise<Handout[]> => {
      const { data, error } = await supabase
        .from('handouts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateHandout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      template: HandoutTemplate
      content?: Record<string, unknown>
      style?: Record<string, unknown>
      seal?: HandoutSeal | null
      image_url?: string | null
    }) => {
      const { data, error } = await supabase
        .from('handouts')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Handout
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handouts', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Handout created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateHandout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      name?: string
      template?: HandoutTemplate
      content?: Record<string, unknown>
      style?: Record<string, unknown>
      seal?: HandoutSeal | null
      image_url?: string | null
    }) => {
      const { data, error } = await supabase
        .from('handouts')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Handout
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handouts', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Handout saved')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteHandout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('handouts').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handouts', data.campaignId] })
      useToastStore.getState().addToast('success', 'Handout deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/handouts/useHandouts.ts
git commit -m "feat(handouts): add CRUD hooks"
```

---

### Task 4: Template Registry & Parchment Base

**Files:**
- Create: `app/src/features/handouts/templates/index.ts`
- Create: `app/src/features/handouts/templates/ParchmentBase.tsx`

- [ ] **Step 1: Create template registry**

```typescript
import type { HandoutTemplate } from '@/lib/types'

export type TemplateConfig = {
  key: HandoutTemplate
  label: string
  emoji: string
  fields: string[]
  defaultFont: string
  fontPresets: { name: string; font: string }[]
}

export const TEMPLATE_CONFIGS: Record<HandoutTemplate, TemplateConfig> = {
  scroll: {
    key: 'scroll',
    label: 'Scroll / Letter',
    emoji: '📜',
    fields: ['title', 'body', 'signature'],
    defaultFont: "'Pinyon Script', cursive",
    fontPresets: [
      { name: 'Elegant', font: "'Pinyon Script', cursive" },
      { name: 'Hasty', font: "'Caveat', cursive" },
      { name: 'Formal', font: "'IM Fell English', serif" },
    ],
  },
  wanted: {
    key: 'wanted',
    label: 'Wanted Poster',
    emoji: '🪧',
    fields: ['heading', 'portrait', 'name', 'description', 'reward'],
    defaultFont: "'Rye', serif",
    fontPresets: [
      { name: 'Western', font: "'Rye', serif" },
      { name: 'Bold', font: "'UnifrakturMaguntia', serif" },
      { name: 'Simple', font: "'Special Elite', monospace" },
    ],
  },
  decree: {
    key: 'decree',
    label: 'Royal Decree',
    emoji: '👑',
    fields: ['title', 'body', 'signature_line', 'date'],
    defaultFont: "'IM Fell English', serif",
    fontPresets: [
      { name: 'Formal', font: "'IM Fell English', serif" },
      { name: 'Regal', font: "'Cinzel', serif" },
      { name: 'Script', font: "'Pinyon Script', cursive" },
    ],
  },
  map_note: {
    key: 'map_note',
    label: 'Map Note',
    emoji: '🗺️',
    fields: ['image', 'caption', 'annotations'],
    defaultFont: "'Caveat', cursive",
    fontPresets: [
      { name: 'Hasty', font: "'Caveat', cursive" },
      { name: 'Neat', font: "'Special Elite', monospace" },
      { name: 'Ancient', font: "'MedievalSharp', serif" },
    ],
  },
  tavern: {
    key: 'tavern',
    label: 'Tavern Menu',
    emoji: '🍺',
    fields: ['establishment_name', 'sections'],
    defaultFont: "'Special Elite', monospace",
    fontPresets: [
      { name: 'Chalk', font: "'Special Elite', monospace" },
      { name: 'Rustic', font: "'MedievalSharp', serif" },
      { name: 'Fancy', font: "'IM Fell English', serif" },
    ],
  },
  broadsheet: {
    key: 'broadsheet',
    label: 'Broadsheet',
    emoji: '📰',
    fields: ['masthead', 'date', 'headline', 'articles', 'ads'],
    defaultFont: "'IM Fell English', serif",
    fontPresets: [
      { name: 'Newsprint', font: "'IM Fell English', serif" },
      { name: 'Gothic', font: "'UnifrakturMaguntia', serif" },
      { name: 'Modern', font: "'Special Elite', monospace" },
    ],
  },
  invitation: {
    key: 'invitation',
    label: 'Invitation',
    emoji: '💌',
    fields: ['host_line', 'event_title', 'details', 'rsvp'],
    defaultFont: "'Pinyon Script', cursive",
    fontPresets: [
      { name: 'Calligraphy', font: "'Pinyon Script', cursive" },
      { name: 'Elegant', font: "'IM Fell English', serif" },
      { name: 'Whimsical', font: "'MedievalSharp', serif" },
    ],
  },
  blank: {
    key: 'blank',
    label: 'Blank Parchment',
    emoji: '📄',
    fields: ['body'],
    defaultFont: "'Caveat', cursive",
    fontPresets: [
      { name: 'Handwritten', font: "'Caveat', cursive" },
      { name: 'Script', font: "'Pinyon Script', cursive" },
      { name: 'Typewriter', font: "'Special Elite', monospace" },
      { name: 'Formal', font: "'IM Fell English', serif" },
    ],
  },
}

export const ALL_FONTS = [
  { name: 'Pinyon Script', value: "'Pinyon Script', cursive" },
  { name: 'Caveat', value: "'Caveat', cursive" },
  { name: 'IM Fell English', value: "'IM Fell English', serif" },
  { name: 'Special Elite', value: "'Special Elite', monospace" },
  { name: 'MedievalSharp', value: "'MedievalSharp', serif" },
  { name: 'Rye', value: "'Rye', serif" },
  { name: 'UnifrakturMaguntia', value: "'UnifrakturMaguntia', serif" },
  { name: 'Cinzel', value: "'Cinzel', serif" },
  { name: 'Dancing Script', value: "'Dancing Script', cursive" },
  { name: 'Satisfy', value: "'Satisfy', cursive" },
]

export const SEAL_COLOURS = [
  { name: 'Crimson', value: '#c0392b' },
  { name: 'Forest', value: '#27ae60' },
  { name: 'Navy', value: '#2c3e7b' },
  { name: 'Black', value: '#2c2c2c' },
  { name: 'Gold', value: '#b8860b' },
  { name: 'Purple', value: '#7b3fa0' },
]
```

- [ ] **Step 2: Create ParchmentBase component**

```tsx
import type { HandoutTemplate } from '@/lib/types'

interface Props {
  template: HandoutTemplate
  children: React.ReactNode
  className?: string
}

const TEMPLATE_TREATMENTS: Record<HandoutTemplate, {
  bg: string
  edgeDarkness: number
  extraClasses: string
}> = {
  scroll: { bg: 'linear-gradient(170deg, #d4a574, #c4956a, #b8865c, #d4a574)', edgeDarkness: 0.3, extraClasses: '' },
  wanted: { bg: 'linear-gradient(170deg, #c4956a, #b08050, #a07040, #c4956a)', edgeDarkness: 0.45, extraClasses: '' },
  decree: { bg: 'linear-gradient(170deg, #e8dcc8, #ddd0b8, #d4c4a8, #e8dcc8)', edgeDarkness: 0.15, extraClasses: '' },
  map_note: { bg: 'linear-gradient(170deg, #c4956a, #b08050, #9a7040, #c4956a)', edgeDarkness: 0.5, extraClasses: '' },
  tavern: { bg: 'linear-gradient(170deg, #3d2b1f, #2e1f14, #3d2b1f, #342518)', edgeDarkness: 0.3, extraClasses: '' },
  broadsheet: { bg: 'linear-gradient(170deg, #e8deb5, #ddd4a5, #d4ca98, #e8deb5)', edgeDarkness: 0.2, extraClasses: '' },
  invitation: { bg: 'linear-gradient(170deg, #f0e8d8, #e8dfc8, #f0e8d8, #e8dfc8)', edgeDarkness: 0.1, extraClasses: '' },
  blank: { bg: 'linear-gradient(170deg, #d4a574, #c4956a, #b8865c, #d4a574)', edgeDarkness: 0.25, extraClasses: '' },
}

export function ParchmentBase({ template, children, className = '' }: Props) {
  const treatment = TEMPLATE_TREATMENTS[template]
  const textColour = template === 'tavern' ? '#e8dcc8' : '#3d2010'

  return (
    <div
      className={`relative rounded overflow-hidden shadow-lg ${className}`}
      style={{
        background: treatment.bg,
        color: textColour,
        minHeight: 420,
      }}
    >
      {/* Aged edges vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(80,40,10,${treatment.edgeDarkness}) 100%)`,
        }}
      />
      {/* Paper grain texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.08,
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* Content */}
      <div className="relative z-[1] p-10">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/handouts/templates/
git commit -m "feat(handouts): add template registry and parchment base"
```

---

### Task 5: Wax Seal Component

**Files:**
- Create: `app/src/features/handouts/WaxSeal.tsx`

- [ ] **Step 1: Create the WaxSeal renderer**

```tsx
import type { HandoutSeal } from '@/lib/types'
import { GameIcon } from '@/components/ui/GameIcon'
import * as Icons from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'

interface Props {
  seal: HandoutSeal
  size?: number
  draggable?: boolean
  onDragEnd?: (position: { x: number; y: number }) => void
}

function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function getClipPath(shape: 'round' | 'shield' | 'oval'): string {
  switch (shape) {
    case 'shield': return 'polygon(50% 0%, 100% 10%, 100% 65%, 50% 100%, 0% 65%, 0% 10%)'
    case 'oval': return 'ellipse(45% 50% at 50% 50%)'
    default: return 'circle(50% at 50% 50%)'
  }
}

export function WaxSeal({ seal, size = 72, draggable = false, onDragEnd }: Props) {
  if (seal.type === 'uploaded') {
    return (
      <img
        src={seal.custom_image_url}
        alt="Custom seal"
        style={{ width: size, height: size, objectFit: 'contain' }}
        draggable={false}
      />
    )
  }

  const darkColour = darkenHex(seal.colour, 0.35)
  const IconComp = (Icons as Record<string, IconComponent>)[seal.icon]
  const clipPath = getClipPath(seal.shape)

  return (
    <div
      style={{
        width: size,
        height: size,
        clipPath,
        background: `radial-gradient(circle at 35% 35%, ${seal.colour}, ${darkenHex(seal.colour, 0.2)}, ${darkenHex(seal.colour, 0.4)})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 3px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.2)',
        cursor: draggable ? 'grab' : 'default',
        position: 'relative',
      }}
    >
      {/* Inner ring */}
      <div
        style={{
          position: 'absolute',
          inset: size * 0.06,
          border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      {/* Icon */}
      {IconComp && (
        <div style={{ color: darkColour, fontSize: size * 0.35 }}>
          <IconComp size={size * 0.35} />
        </div>
      )}
      {/* Ring text */}
      {seal.ring_text && (
        <div
          style={{
            fontSize: Math.max(6, size * 0.09),
            color: darkColour,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: 1,
            fontFamily: "'Spectral SC', serif",
          }}
        >
          {seal.ring_text}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/handouts/WaxSeal.tsx
git commit -m "feat(handouts): add WaxSeal renderer with embossed icon effect"
```

---

### Task 6: Icon Picker Modal

**Files:**
- Create: `app/src/features/handouts/IconPickerModal.tsx`

- [ ] **Step 1: Create the icon picker**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ScaleIn } from '@/components/motion'
import * as Icons from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'

interface Props {
  onSelect: (iconName: string) => void
  onClose: () => void
}

// Build a list of all Gi icons from the barrel
const ICON_ENTRIES: { name: string; component: IconComponent }[] = Object.entries(Icons)
  .filter(([key]) => key.startsWith('Gi') && key !== 'GiSun' && key !== 'GiMoonBats')
  .map(([name, component]) => ({ name, component: component as IconComponent }))

export function IconPickerModal({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? ICON_ENTRIES.filter((e) =>
        e.name.replace(/^Gi/, '').replace(/([A-Z])/g, ' $1').toLowerCase().includes(search.toLowerCase())
      )
    : ICON_ENTRIES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <ScaleIn>
        <div
          className="bg-bg-base border border-border rounded-[--radius-lg] w-[480px] max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm text-text-heading font-medium">Choose Seal Icon</h3>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div className="px-4 py-2">
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-8 gap-1">
              {filtered.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => { onSelect(entry.name); onClose() }}
                  className="p-2 rounded-[--radius-sm] hover:bg-bg-raised transition-colors cursor-pointer flex items-center justify-content-center"
                  title={entry.name.replace(/^Gi/, '').replace(/([A-Z])/g, ' $1').trim()}
                >
                  <entry.component size={24} className="text-text-body mx-auto" />
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center">No icons match "{search}"</p>
            )}
          </div>
        </div>
      </ScaleIn>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/handouts/IconPickerModal.tsx
git commit -m "feat(handouts): add icon picker modal for seal builder"
```

---

### Task 7: Seal Builder Controls

**Files:**
- Create: `app/src/features/handouts/SealBuilder.tsx`

- [ ] **Step 1: Create the seal builder form**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WaxSeal } from './WaxSeal'
import { IconPickerModal } from './IconPickerModal'
import { SEAL_COLOURS } from './templates'
import type { HandoutSeal } from '@/lib/types'
import { uploadImage } from '@/lib/storage'

interface Props {
  seal: HandoutSeal | null
  campaignId: string
  onChange: (seal: HandoutSeal | null) => void
}

const DEFAULT_SEAL: HandoutSeal = {
  type: 'built',
  icon: 'GiCrossedSwords',
  ring_text: '',
  colour: '#c0392b',
  shape: 'round',
  position: { x: 80, y: 85 },
}

export function SealBuilder({ seal, campaignId, onChange }: Props) {
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [customColour, setCustomColour] = useState('')

  const activeSeal = seal ?? DEFAULT_SEAL

  const toggleSeal = () => {
    onChange(seal ? null : DEFAULT_SEAL)
  }

  const updateBuiltSeal = (updates: Partial<Extract<HandoutSeal, { type: 'built' }>>) => {
    if (activeSeal.type !== 'built') return
    onChange({ ...activeSeal, ...updates })
  }

  const handleUploadSeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(campaignId, 'seals', file)
    onChange({ type: 'uploaded', custom_image_url: url, position: activeSeal.position })
    e.target.value = ''
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted">Wax Seal</label>
        <Button size="sm" variant="ghost" onClick={toggleSeal}>
          {seal ? 'Remove' : '+ Add Seal'}
        </Button>
      </div>

      {seal && (
        <div className="space-y-3">
          {/* Seal preview */}
          <div className="flex gap-3 items-start">
            <WaxSeal seal={activeSeal} size={64} />
            <div className="flex-1 text-xs text-text-secondary">
              {activeSeal.type === 'built' ? (
                <>
                  <div className="text-text-body mb-1">{activeSeal.icon.replace(/^Gi/, '').replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setShowIconPicker(true)}>Change Icon</Button>
                  </div>
                </>
              ) : (
                <div className="text-text-body">Custom seal image</div>
              )}
            </div>
          </div>

          {activeSeal.type === 'built' && (
            <>
              {/* Ring text */}
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Ring Text</label>
                <Input
                  value={activeSeal.ring_text}
                  onChange={(e) => updateBuiltSeal({ ring_text: e.target.value })}
                  placeholder="e.g. House Ashara"
                />
              </div>

              {/* Colour swatches */}
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Colour</label>
                <div className="flex gap-1.5 flex-wrap">
                  {SEAL_COLOURS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateBuiltSeal({ colour: c.value })}
                      className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-colors ${
                        activeSeal.colour === c.value ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ background: c.value }}
                      title={c.name}
                    />
                  ))}
                  <Input
                    value={customColour}
                    onChange={(e) => { setCustomColour(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) updateBuiltSeal({ colour: e.target.value }) }}
                    placeholder="#hex"
                    className="w-20 text-xs"
                  />
                </div>
              </div>

              {/* Shape */}
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Shape</label>
                <div className="flex gap-1.5">
                  {(['round', 'shield', 'oval'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateBuiltSeal({ shape: s })}
                      className={`px-3 py-1 text-xs rounded-[--radius-sm] cursor-pointer border transition-colors ${
                        activeSeal.shape === s
                          ? 'bg-primary/20 border-primary text-primary-light'
                          : 'bg-bg-raised border-border text-text-muted'
                      }`}
                    >
                      {s === 'round' ? '● Round' : s === 'shield' ? '◆ Shield' : '⬮ Oval'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Upload custom option */}
          <div>
            <label className="text-xs text-primary cursor-pointer hover:underline">
              {activeSeal.type === 'built' ? 'or upload custom seal →' : 'Change image'}
              <input type="file" accept="image/*" onChange={handleUploadSeal} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {showIconPicker && (
        <IconPickerModal
          onSelect={(iconName) => updateBuiltSeal({ icon: iconName })}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/handouts/SealBuilder.tsx
git commit -m "feat(handouts): add seal builder with icon/colour/shape controls"
```

---

### Task 8: Template Components (Scroll, Wanted, Decree, Blank)

**Files:**
- Create: `app/src/features/handouts/templates/ScrollTemplate.tsx`
- Create: `app/src/features/handouts/templates/WantedTemplate.tsx`
- Create: `app/src/features/handouts/templates/DecreeTemplate.tsx`
- Create: `app/src/features/handouts/templates/BlankTemplate.tsx`

- [ ] **Step 1: Create ScrollTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function ScrollTemplate({ content, style }: Props) {
  const font = style.font_family || "'Pinyon Script', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="scroll">
      {/* Rolled edge top */}
      <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(to bottom, rgba(80,40,10,0.25), transparent)' }} />

      {content.title && (
        <div className="text-center mb-6" style={{ fontFamily: font, fontSize: size * 1.4, fontWeight: 700 }}>
          {content.title as string}
        </div>
      )}

      {content.body && (
        <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {content.body as string}
        </div>
      )}

      {content.signature && (
        <div className="mt-6 text-right" style={{ fontFamily: font, fontSize: size, fontStyle: 'italic' }}>
          — {content.signature as string}
        </div>
      )}

      {/* Rolled edge bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(to top, rgba(80,40,10,0.25), transparent)' }} />
    </ParchmentBase>
  )
}
```

- [ ] **Step 2: Create WantedTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
  imageUrl: string | null
}

export function WantedTemplate({ content, style, imageUrl }: Props) {
  const font = style.font_family || "'Rye', serif"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="wanted">
      {/* Tack holes */}
      {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
        <div key={i} className="absolute w-3 h-3 rounded-full z-[2]"
          style={{ ...pos, background: 'radial-gradient(circle, #555 30%, transparent 70%)' } as React.CSSProperties} />
      ))}

      <div className="text-center" style={{ fontFamily: font }}>
        <div className="text-4xl font-bold tracking-wider mb-4" style={{ fontSize: size * 2.5 }}>
          {(content.heading as string) || 'WANTED'}
        </div>

        {/* Portrait area */}
        <div className="mx-auto mb-4 w-40 h-40 border-2 border-current flex items-center justify-center overflow-hidden"
          style={{ opacity: 0.8 }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm opacity-50">Portrait</span>
          )}
        </div>

        {content.name && (
          <div className="text-xl font-bold mb-2" style={{ fontSize: size * 1.4 }}>
            {content.name as string}
          </div>
        )}

        {content.description && (
          <div className="mb-4 text-sm" style={{ fontSize: size * 0.85 }}>
            {content.description as string}
          </div>
        )}

        {content.reward && (
          <div className="mt-4 pt-3 border-t border-current/30">
            <div className="text-xs uppercase tracking-wider mb-1">Reward</div>
            <div className="text-2xl font-bold" style={{ fontSize: size * 1.6 }}>
              {content.reward as string}
            </div>
          </div>
        )}
      </div>
    </ParchmentBase>
  )
}
```

- [ ] **Step 3: Create DecreeTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function DecreeTemplate({ content, style }: Props) {
  const font = style.font_family || "'IM Fell English', serif"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="decree">
      {/* Ornamental border */}
      <div className="absolute inset-4 border border-current/20 pointer-events-none z-[2]" />
      <div className="absolute inset-6 border border-current/10 pointer-events-none z-[2]" />

      <div className="text-center" style={{ fontFamily: font }}>
        {content.title && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[4px] mb-2 opacity-60">By Royal Decree</div>
            <div className="text-2xl font-bold" style={{ fontSize: size * 1.6 }}>
              {content.title as string}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 opacity-40">
              <div className="h-px w-12 bg-current" />
              <div className="text-xs">✦</div>
              <div className="h-px w-12 bg-current" />
            </div>
          </div>
        )}

        {content.body && (
          <div className="text-left mb-6" style={{ fontFamily: font, fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {content.body as string}
          </div>
        )}

        <div className="mt-8 flex justify-between items-end">
          {content.signature_line && (
            <div className="text-left">
              <div className="border-t border-current/40 pt-1 min-w-[160px]" style={{ fontFamily: font, fontSize: size * 0.9 }}>
                {content.signature_line as string}
              </div>
            </div>
          )}
          {content.date && (
            <div className="text-right text-sm opacity-60" style={{ fontSize: size * 0.8 }}>
              {content.date as string}
            </div>
          )}
        </div>
      </div>
    </ParchmentBase>
  )
}
```

- [ ] **Step 4: Create BlankTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function BlankTemplate({ content, style }: Props) {
  const font = style.font_family || "'Caveat', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="blank">
      {content.body && (
        <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {content.body as string}
        </div>
      )}
    </ParchmentBase>
  )
}
```

- [ ] **Step 5: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/handouts/templates/ScrollTemplate.tsx app/src/features/handouts/templates/WantedTemplate.tsx app/src/features/handouts/templates/DecreeTemplate.tsx app/src/features/handouts/templates/BlankTemplate.tsx
git commit -m "feat(handouts): add scroll, wanted, decree, blank templates"
```

---

### Task 9: Template Components (Tavern, Broadsheet, MapNote, Invitation)

**Files:**
- Create: `app/src/features/handouts/templates/TavernTemplate.tsx`
- Create: `app/src/features/handouts/templates/BroadsheetTemplate.tsx`
- Create: `app/src/features/handouts/templates/MapNoteTemplate.tsx`
- Create: `app/src/features/handouts/templates/InvitationTemplate.tsx`

- [ ] **Step 1: Create TavernTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

type MenuSection = { name: string; items: { name: string; price: string }[] }

export function TavernTemplate({ content, style }: Props) {
  const font = style.font_family || "'Special Elite', monospace"
  const size = style.font_size || 16
  const sections = (content.sections ?? []) as MenuSection[]

  return (
    <ParchmentBase template="tavern">
      {content.establishment_name && (
        <div className="text-center mb-6" style={{ fontFamily: font, fontSize: size * 1.8, fontWeight: 700 }}>
          {content.establishment_name as string}
        </div>
      )}

      {/* Chalk-line divider */}
      <div className="border-t border-current/20 mb-4" />

      {sections.map((section, i) => (
        <div key={i} className="mb-4">
          <div className="text-center uppercase tracking-wider mb-2 opacity-80" style={{ fontFamily: font, fontSize: size * 0.85 }}>
            {section.name}
          </div>
          {section.items.map((item, j) => (
            <div key={j} className="flex justify-between items-baseline mb-1" style={{ fontFamily: font, fontSize: size }}>
              <span>{item.name}</span>
              <span className="flex-1 border-b border-dotted border-current/20 mx-2" />
              <span>{item.price}</span>
            </div>
          ))}
        </div>
      ))}
    </ParchmentBase>
  )
}
```

- [ ] **Step 2: Create BroadsheetTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

type Article = { headline: string; body: string }

export function BroadsheetTemplate({ content, style }: Props) {
  const font = style.font_family || "'IM Fell English', serif"
  const size = style.font_size || 14
  const articles = (content.articles ?? []) as Article[]

  return (
    <ParchmentBase template="broadsheet">
      {/* Fold crease */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-current/10 pointer-events-none z-[2]" />

      {/* Masthead */}
      {content.masthead && (
        <div className="text-center border-b-2 border-current/30 pb-2 mb-1">
          <div className="text-3xl font-bold tracking-wide" style={{ fontFamily: "'UnifrakturMaguntia', serif", fontSize: size * 2.2 }}>
            {content.masthead as string}
          </div>
        </div>
      )}

      {content.date && (
        <div className="text-center text-xs mb-3 opacity-60 border-b border-current/20 pb-1" style={{ fontFamily: font }}>
          {content.date as string}
        </div>
      )}

      {/* Main headline */}
      {content.headline && (
        <div className="text-center mb-4" style={{ fontFamily: font, fontSize: size * 1.6, fontWeight: 700, lineHeight: 1.2 }}>
          {content.headline as string}
        </div>
      )}

      {/* Articles in columns */}
      <div className={articles.length > 1 ? 'columns-2 gap-4' : ''} style={{ fontFamily: font, fontSize: size }}>
        {articles.map((article, i) => (
          <div key={i} className="mb-3 break-inside-avoid">
            <div className="font-bold mb-1 text-sm" style={{ fontSize: size * 1.1 }}>{article.headline}</div>
            <div className="leading-relaxed whitespace-pre-line" style={{ fontSize: size * 0.9 }}>{article.body}</div>
          </div>
        ))}
      </div>

      {/* Ads section */}
      {content.ads && (
        <div className="mt-4 pt-2 border-t border-current/20 text-center text-xs opacity-60" style={{ fontFamily: font, fontSize: size * 0.75 }}>
          {content.ads as string}
        </div>
      )}
    </ParchmentBase>
  )
}
```

- [ ] **Step 3: Create MapNoteTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
  imageUrl: string | null
}

export function MapNoteTemplate({ content, style, imageUrl }: Props) {
  const font = style.font_family || "'Caveat', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="map_note">
      {/* Coffee stain effect */}
      <div className="absolute top-16 right-8 w-24 h-24 rounded-full pointer-events-none z-[2]"
        style={{ background: 'radial-gradient(circle, rgba(101,67,33,0.15) 0%, transparent 70%)' }} />

      {/* Map image */}
      {imageUrl && (
        <div className="mb-4 rounded overflow-hidden border border-current/20">
          <img src={imageUrl} alt="" className="w-full object-contain max-h-64" />
        </div>
      )}

      {!imageUrl && (
        <div className="mb-4 h-48 border border-dashed border-current/30 rounded flex items-center justify-center">
          <span className="text-sm opacity-40">Upload a map image</span>
        </div>
      )}

      {content.caption && (
        <div className="text-center mb-3" style={{ fontFamily: font, fontSize: size * 1.2, fontWeight: 700 }}>
          {content.caption as string}
        </div>
      )}

      {content.annotations && (
        <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {content.annotations as string}
        </div>
      )}
    </ParchmentBase>
  )
}
```

- [ ] **Step 4: Create InvitationTemplate**

```tsx
import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function InvitationTemplate({ content, style }: Props) {
  const font = style.font_family || "'Pinyon Script', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="invitation">
      {/* Gilt ornamental border */}
      <div className="absolute inset-5 border border-amber-700/30 pointer-events-none z-[2]" />
      <div className="absolute inset-7 border border-amber-700/15 pointer-events-none z-[2]" />
      {/* Corner flourishes */}
      {[
        { top: 16, left: 16 }, { top: 16, right: 16 },
        { bottom: 16, left: 16 }, { bottom: 16, right: 16 },
      ].map((pos, i) => (
        <div key={i} className="absolute text-amber-700/40 text-lg z-[2]" style={pos as React.CSSProperties}>
          ✦
        </div>
      ))}

      <div className="text-center py-4" style={{ fontFamily: font }}>
        {content.host_line && (
          <div className="mb-4 text-sm opacity-70" style={{ fontSize: size * 0.85 }}>
            {content.host_line as string}
          </div>
        )}

        <div className="mb-1 text-xs uppercase tracking-[3px] opacity-50">cordially invites you to</div>

        {content.event_title && (
          <div className="my-4" style={{ fontSize: size * 1.8, fontWeight: 700, lineHeight: 1.2 }}>
            {content.event_title as string}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 my-4 opacity-30">
          <div className="h-px w-16 bg-current" />
          <div className="text-xs">✦</div>
          <div className="h-px w-16 bg-current" />
        </div>

        {content.details && (
          <div className="mb-4" style={{ fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {content.details as string}
          </div>
        )}

        {content.rsvp && (
          <div className="mt-6 text-sm opacity-70" style={{ fontSize: size * 0.85 }}>
            {content.rsvp as string}
          </div>
        )}
      </div>
    </ParchmentBase>
  )
}
```

- [ ] **Step 5: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/handouts/templates/TavernTemplate.tsx app/src/features/handouts/templates/BroadsheetTemplate.tsx app/src/features/handouts/templates/MapNoteTemplate.tsx app/src/features/handouts/templates/InvitationTemplate.tsx
git commit -m "feat(handouts): add tavern, broadsheet, map note, invitation templates"
```

---

### Task 10: Handout Preview Component

**Files:**
- Create: `app/src/features/handouts/HandoutPreview.tsx`

- [ ] **Step 1: Create the preview renderer that delegates to template components**

```tsx
import { useRef, useCallback } from 'react'
import type { Handout } from '@/lib/types'
import { WaxSeal } from './WaxSeal'
import { ScrollTemplate } from './templates/ScrollTemplate'
import { WantedTemplate } from './templates/WantedTemplate'
import { DecreeTemplate } from './templates/DecreeTemplate'
import { MapNoteTemplate } from './templates/MapNoteTemplate'
import { TavernTemplate } from './templates/TavernTemplate'
import { BroadsheetTemplate } from './templates/BroadsheetTemplate'
import { InvitationTemplate } from './templates/InvitationTemplate'
import { BlankTemplate } from './templates/BlankTemplate'

interface Props {
  template: Handout['template']
  content: Record<string, unknown>
  style: Handout['style']
  seal: Handout['seal']
  imageUrl: string | null
  onSealMove?: (position: { x: number; y: number }) => void
  previewRef?: React.RefObject<HTMLDivElement | null>
}

export function HandoutPreview({ template, content, style, seal, imageUrl, onSealMove, previewRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = previewRef ?? containerRef

  const handleSealDrag = useCallback((e: React.DragEvent) => {
    if (!onSealMove || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onSealMove({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }, [onSealMove, ref])

  const renderTemplate = () => {
    switch (template) {
      case 'scroll': return <ScrollTemplate content={content} style={style} />
      case 'wanted': return <WantedTemplate content={content} style={style} imageUrl={imageUrl} />
      case 'decree': return <DecreeTemplate content={content} style={style} />
      case 'map_note': return <MapNoteTemplate content={content} style={style} imageUrl={imageUrl} />
      case 'tavern': return <TavernTemplate content={content} style={style} />
      case 'broadsheet': return <BroadsheetTemplate content={content} style={style} />
      case 'invitation': return <InvitationTemplate content={content} style={style} />
      case 'blank': return <BlankTemplate content={content} style={style} />
    }
  }

  return (
    <div
      ref={ref}
      className="relative w-[400px] max-w-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleSealDrag}
    >
      {renderTemplate()}

      {/* Draggable wax seal overlay */}
      {seal && (
        <div
          draggable
          onDragEnd={handleSealDrag}
          className="absolute cursor-grab active:cursor-grabbing"
          style={{
            left: `${seal.position.x}%`,
            top: `${seal.position.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        >
          <WaxSeal seal={seal} size={72} draggable />
          <div className="text-center mt-1 text-[9px] text-text-muted select-none">drag to move</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/handouts/HandoutPreview.tsx
git commit -m "feat(handouts): add preview renderer with draggable seal"
```

---

### Task 11: Handout Editor (Split Panel)

**Files:**
- Create: `app/src/features/handouts/HandoutEditor.tsx`

- [ ] **Step 1: Install html-to-image**

Run: `cd app && npm install html-to-image`
Expected: Package added to package.json.

- [ ] **Step 2: Add Google Fonts link to index.html**

Modify `app/index.html` — add inside `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Caveat:wght@400;700&family=IM+Fell+English:ital@0;1&family=Special+Elite&family=MedievalSharp&family=Rye&family=UnifrakturMaguntia&family=Dancing+Script:wght@400;700&family=Satisfy&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Create HandoutEditor component**

```tsx
import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Handout, HandoutTemplate, HandoutSeal } from '@/lib/types'
import { useUpdateHandout } from './useHandouts'
import { uploadImage } from '@/lib/storage'
import { HandoutPreview } from './HandoutPreview'
import { SealBuilder } from './SealBuilder'
import { TEMPLATE_CONFIGS, ALL_FONTS } from './templates'

interface Props {
  handout: Handout
  campaignId: string
  onClose: () => void
}

export function HandoutEditor({ handout, campaignId, onClose }: Props) {
  const updateHandout = useUpdateHandout()
  const previewRef = useRef<HTMLDivElement>(null)

  const [template, setTemplate] = useState<HandoutTemplate>(handout.template)
  const [content, setContent] = useState<Record<string, unknown>>(handout.content)
  const [style, setStyle] = useState<Handout['style']>(handout.style)
  const [seal, setSeal] = useState<HandoutSeal | null>(handout.seal)
  const [imageUrl, setImageUrl] = useState<string | null>(handout.image_url)
  const [name, setName] = useState(handout.name)
  const [showAllFonts, setShowAllFonts] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const config = TEMPLATE_CONFIGS[template]
  const currentFont = style.font_family || config.defaultFont
  const currentSize = style.font_size || 16

  const updateContent = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    updateHandout.mutate({ id: handout.id, name, template, content, style, seal, image_url: imageUrl })
  }

  const handleExport = async () => {
    if (!previewRef.current) return
    const dataUrl = await toPng(previewRef.current, { pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = `${name || 'handout'}.png`
    link.href = dataUrl
    link.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadImage(campaignId, 'handouts', file)
      setImageUrl(url)
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleTemplateChange = (t: HandoutTemplate) => {
    setTemplate(t)
    const newConfig = TEMPLATE_CONFIGS[t]
    setStyle((prev) => ({ ...prev, font_family: newConfig.defaultFont }))
  }

  const handleSealMove = (position: { x: number; y: number }) => {
    if (!seal) return
    setSeal({ ...seal, position })
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0">
      {/* Left Panel: Form */}
      <div className="w-full lg:w-80 lg:min-w-80 bg-bg-deep border-r border-border overflow-y-auto p-5 space-y-4">
        {/* Back button */}
        <Button size="sm" variant="ghost" onClick={onClose}>← Back</Button>

        {/* Name */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Template selector */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-2">Template</label>
          <div className="flex gap-1.5 flex-wrap">
            {Object.values(TEMPLATE_CONFIGS).map((t) => (
              <button
                key={t.key}
                onClick={() => handleTemplateChange(t.key)}
                className={`px-2.5 py-1 text-xs rounded-[--radius-sm] cursor-pointer border transition-colors ${
                  template === t.key
                    ? 'bg-primary/20 border-primary text-primary-light'
                    : 'bg-bg-raised border-border text-text-muted hover:text-text-body'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template-specific content fields */}
        {config.fields.includes('title') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Title</label>
            <Input value={(content.title as string) || ''} onChange={(e) => updateContent('title', e.target.value)} />
          </div>
        )}
        {config.fields.includes('heading') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Heading</label>
            <Input value={(content.heading as string) || 'WANTED'} onChange={(e) => updateContent('heading', e.target.value)} />
          </div>
        )}
        {config.fields.includes('body') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Body Text</label>
            <textarea
              value={(content.body as string) || ''}
              onChange={(e) => updateContent('body', e.target.value)}
              className="w-full h-32 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('signature') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Signature</label>
            <Input value={(content.signature as string) || ''} onChange={(e) => updateContent('signature', e.target.value)} />
          </div>
        )}
        {config.fields.includes('name') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Target Name</label>
            <Input value={(content.name as string) || ''} onChange={(e) => updateContent('name', e.target.value)} />
          </div>
        )}
        {config.fields.includes('description') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Description</label>
            <textarea
              value={(content.description as string) || ''}
              onChange={(e) => updateContent('description', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('reward') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Reward</label>
            <Input value={(content.reward as string) || ''} onChange={(e) => updateContent('reward', e.target.value)} />
          </div>
        )}
        {config.fields.includes('signature_line') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Signature Line</label>
            <Input value={(content.signature_line as string) || ''} onChange={(e) => updateContent('signature_line', e.target.value)} />
          </div>
        )}
        {config.fields.includes('date') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Date</label>
            <Input value={(content.date as string) || ''} onChange={(e) => updateContent('date', e.target.value)} />
          </div>
        )}
        {config.fields.includes('caption') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Caption</label>
            <Input value={(content.caption as string) || ''} onChange={(e) => updateContent('caption', e.target.value)} />
          </div>
        )}
        {config.fields.includes('annotations') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Annotations</label>
            <textarea
              value={(content.annotations as string) || ''}
              onChange={(e) => updateContent('annotations', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('establishment_name') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Establishment Name</label>
            <Input value={(content.establishment_name as string) || ''} onChange={(e) => updateContent('establishment_name', e.target.value)} />
          </div>
        )}
        {config.fields.includes('masthead') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Masthead</label>
            <Input value={(content.masthead as string) || ''} onChange={(e) => updateContent('masthead', e.target.value)} />
          </div>
        )}
        {config.fields.includes('headline') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Headline</label>
            <Input value={(content.headline as string) || ''} onChange={(e) => updateContent('headline', e.target.value)} />
          </div>
        )}
        {config.fields.includes('host_line') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Host</label>
            <Input value={(content.host_line as string) || ''} onChange={(e) => updateContent('host_line', e.target.value)} />
          </div>
        )}
        {config.fields.includes('event_title') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Event Title</label>
            <Input value={(content.event_title as string) || ''} onChange={(e) => updateContent('event_title', e.target.value)} />
          </div>
        )}
        {config.fields.includes('details') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Details</label>
            <textarea
              value={(content.details as string) || ''}
              onChange={(e) => updateContent('details', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('rsvp') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">RSVP</label>
            <Input value={(content.rsvp as string) || ''} onChange={(e) => updateContent('rsvp', e.target.value)} />
          </div>
        )}

        {/* Image upload for portrait/map templates */}
        {(config.fields.includes('portrait') || config.fields.includes('image')) && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Image</label>
            <label className="block text-xs text-primary cursor-pointer hover:underline">
              {uploadingImage ? 'Uploading...' : imageUrl ? 'Change image' : 'Upload image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Font style presets */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-2">Font Style</label>
          <div className="flex gap-1.5 flex-wrap">
            {config.fontPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setStyle((prev) => ({ ...prev, font_family: preset.font }))}
                className={`flex-1 min-w-[70px] px-2 py-2 rounded-[--radius-sm] cursor-pointer border text-center transition-colors ${
                  currentFont === preset.font
                    ? 'bg-primary/20 border-primary'
                    : 'bg-bg-raised border-border'
                }`}
              >
                <div style={{ fontFamily: preset.font, fontSize: 16 }} className="text-text-heading">{preset.name}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowAllFonts(!showAllFonts)} className="mt-1 text-xs text-primary cursor-pointer hover:underline">
            {showAllFonts ? 'hide' : 'choose from all fonts →'}
          </button>
          {showAllFonts && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {ALL_FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStyle((prev) => ({ ...prev, font_family: f.value }))}
                  className={`w-full text-left px-2 py-1 rounded-[--radius-sm] cursor-pointer transition-colors ${
                    currentFont === f.value ? 'bg-primary/20 text-primary-light' : 'hover:bg-bg-raised text-text-body'
                  }`}
                  style={{ fontFamily: f.value, fontSize: 14 }}
                >
                  {f.name} — The quick brown fox
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text size slider */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Text Size</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">A</span>
            <input
              type="range"
              min={10}
              max={24}
              value={currentSize}
              onChange={(e) => setStyle((prev) => ({ ...prev, font_size: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-lg text-text-muted">A</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Wax Seal */}
        <SealBuilder seal={seal} campaignId={campaignId} onChange={setSeal} />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">💾 Save</Button>
          <Button variant="secondary" onClick={handleExport} className="flex-1">📥 Export PNG</Button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="flex-1 bg-bg-raised flex items-center justify-center p-6 overflow-auto min-h-[400px]">
        <HandoutPreview
          template={template}
          content={content}
          style={style}
          seal={seal}
          imageUrl={imageUrl}
          onSealMove={handleSealMove}
          previewRef={previewRef}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/handouts/HandoutEditor.tsx app/index.html app/package.json app/package-lock.json
git commit -m "feat(handouts): add split-panel editor with live preview and PNG export"
```

---

### Task 12: Handouts Page

**Files:**
- Create: `app/src/features/handouts/HandoutsPage.tsx`

- [ ] **Step 1: Create the HandoutsPage component**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiQuillInk } from '@/components/ui/icons'
import { StaggerList, StaggerItem, ScaleIn } from '@/components/motion'
import type { Handout, HandoutTemplate } from '@/lib/types'
import { useHandouts, useCreateHandout, useDeleteHandout } from './useHandouts'
import { HandoutEditor } from './HandoutEditor'
import { TEMPLATE_CONFIGS } from './templates'

interface Props {
  campaignId: string
}

export function HandoutsPage({ campaignId }: Props) {
  const { data: handouts, isLoading } = useHandouts(campaignId)
  const createHandout = useCreateHandout()
  const deleteHandout = useDeleteHandout()
  const [editing, setEditing] = useState<Handout | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTemplate, setNewTemplate] = useState<HandoutTemplate>('scroll')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const result = await createHandout.mutateAsync({
      campaign_id: campaignId,
      name: newName.trim(),
      template: newTemplate,
    })
    setShowCreate(false)
    setNewName('')
    setEditing(result)
  }

  const handleDelete = (id: string) => {
    deleteHandout.mutate({ id, campaignId })
    setConfirmDelete(null)
  }

  // Show editor full-screen when editing
  if (editing) {
    return (
      <div className="h-[calc(100vh-64px)]">
        <HandoutEditor
          handout={editing}
          campaignId={campaignId}
          onClose={() => setEditing(null)}
        />
      </div>
    )
  }

  if (isLoading) return <p className="text-text-muted text-sm py-4">Loading...</p>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2 font-heading text-text-heading">
          <GameIcon icon={GiQuillInk} size="xl" /> Handouts
        </h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Handout'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <ScaleIn>
          <div className="bg-bg-base border border-border rounded-[--radius-lg] p-4 mb-6 space-y-3">
            <Input
              placeholder="Handout name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-2">Template</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.values(TEMPLATE_CONFIGS).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setNewTemplate(t.key)}
                    className={`px-2.5 py-1 text-xs rounded-[--radius-sm] cursor-pointer border transition-colors ${
                      newTemplate === t.key
                        ? 'bg-primary/20 border-primary text-primary-light'
                        : 'bg-bg-raised border-border text-text-muted'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim() || createHandout.isPending}>
              Create
            </Button>
          </div>
        </ScaleIn>
      )}

      {/* Empty state */}
      {handouts?.length === 0 && !showCreate && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary mb-2">No handouts yet.</p>
          <p className="text-text-muted text-sm">Create scrolls, wanted posters, decrees, and more to share with your players.</p>
        </div>
      )}

      {/* Grid */}
      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {handouts?.map((h) => {
          const config = TEMPLATE_CONFIGS[h.template]
          return (
            <StaggerItem key={h.id}>
              <div className="bg-bg-base border border-border rounded-[--radius-lg] overflow-hidden hover:border-border-hover transition-colors group ornamental-corners">
                {/* Thumbnail band */}
                <div className="h-24 bg-gradient-to-br from-amber-900/20 to-amber-800/10 flex items-center justify-center">
                  <span className="text-4xl opacity-50">{config.emoji}</span>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-heading truncate">{h.name}</div>
                      <div className="text-xs text-text-muted">{config.label}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(h)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => setConfirmDelete(h.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmDelete === h.id && (
                  <div className="px-3 pb-3 flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    <Button size="sm" className="flex-1 bg-danger text-white" onClick={() => handleDelete(h.id)}>Delete</Button>
                  </div>
                )}
              </div>
            </StaggerItem>
          )
        })}
      </StaggerList>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/handouts/HandoutsPage.tsx
git commit -m "feat(handouts): add handouts page with grid view and create flow"
```

---

### Task 13: Route & Sidebar Integration

**Files:**
- Modify: `app/src/routes/router.tsx`
- Modify: `app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add route to router.tsx**

Add import at top:
```typescript
import { HandoutsPage } from '@/features/handouts/HandoutsPage'
```

Add route definition after `locationsRoute`:
```typescript
const handoutsRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/handouts',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <HandoutsPage campaignId={campaignId} />
  },
})
```

Add `handoutsRoute` to the route tree after `locationsRoute`:
```typescript
campaignRoute.addChildren([
    campaignOverviewRoute,
    charactersRoute,
    bestiaryRoute,
    spellbookRoute,
    locationsRoute,
    handoutsRoute,     // <-- add here
    generatorsRoute,
    scratchpadRoute,
    sessionsRoute,
    sessionDetailRoute,
  ]),
```

- [ ] **Step 2: Add nav item to Sidebar.tsx**

Add `GiQuillInk` to the icon import from `@/components/ui/icons` (it's already exported from the barrel).

Add the nav item to the `campaignNav` array after Locations:
```typescript
{ icon: GiQuillInk, label: 'Handouts', to: '/campaign/$campaignId/handouts' },
```

- [ ] **Step 3: Verify app compiles and runs**

Run: `cd app && npx tsc --noEmit && npm run dev`
Expected: No errors, dev server starts. Navigate to the Handouts page in the sidebar.

- [ ] **Step 4: Commit**

```bash
git add app/src/routes/router.tsx app/src/components/layout/Sidebar.tsx
git commit -m "feat(handouts): add route and sidebar navigation"
```

---

### Task 14: Timeline Integration (ContentDrawer + BlockCard)

**Files:**
- Modify: `app/src/features/timeline/ContentDrawer.tsx`
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx`
- Create: `app/src/features/handouts/HandoutSnapshot.tsx`

- [ ] **Step 1: Create HandoutSnapshot for timeline rendering**

```tsx
import type { Handout } from '@/lib/types'
import { TEMPLATE_CONFIGS } from './templates'

interface Props {
  data: Record<string, unknown>
}

export function HandoutSnapshot({ data }: Props) {
  const template = data.template as Handout['template']
  const config = TEMPLATE_CONFIGS[template]
  const content = data.content as Record<string, unknown>

  return (
    <div className="text-sm space-y-1">
      <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
        {config?.emoji} {config?.label || template}
      </span>
      {content?.title && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.title as string}</p>
      )}
      {content?.body && (
        <p className="text-xs text-text-secondary line-clamp-3">{content.body as string}</p>
      )}
      {content?.establishment_name && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.establishment_name as string}</p>
      )}
      {content?.headline && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.headline as string}</p>
      )}
      {content?.event_title && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.event_title as string}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update TimelineBlockCard.tsx**

Add to imports:
```typescript
import { HandoutSnapshot } from '@/features/handouts/HandoutSnapshot'
```

Add `GiQuillInk` to the icon import.

Add entry to `BLOCK_STYLES`:
```typescript
handout: { icon: GiQuillInk, borderColor: 'border-l-amber-600', label: 'Handout' },
```

Add rendering in the content section (after the location block):
```tsx
{block.block_type === 'handout' && <HandoutSnapshot data={snapshot} />}
```

- [ ] **Step 3: Update ContentDrawer.tsx**

Add to imports:
```typescript
import { GiQuillInk } from '@/components/ui/icons'
import { useHandouts } from '@/features/handouts/useHandouts'
import type { Handout } from '@/lib/types'
```

Add `'handouts'` to the Tab type:
```typescript
type Tab = 'characters' | 'monsters' | 'spells' | 'locations' | 'inspiration' | 'handouts'
```

Add tab button to the tab list array:
```typescript
{ key: 'handouts' as Tab, label: 'Handouts', icon: GiQuillInk },
```

Add tab content rendering:
```tsx
{tab === 'handouts' && <HandoutItems campaignId={campaignId} filter={filter} onAdd={onAddToTimeline} />}
```

Add the HandoutItems component:
```tsx
function HandoutItems({ campaignId, filter, onAdd }: {
  campaignId: string; filter: string
  onAdd: (b: { block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: handouts } = useHandouts(campaignId)
  const filtered = handouts?.filter((h: Handout) => h.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {filtered?.map((h: Handout) => (
        <ItemRow
          key={h.id}
          icon={GiQuillInk}
          name={h.name}
          subtitle={h.template}
          onAdd={() => onAdd({
            block_type: 'handout',
            source_id: h.id,
            title: h.name,
            content_snapshot: {
              template: h.template,
              content: h.content,
              style: h.style,
              seal: h.seal,
            },
          })}
        />
      ))}
      {!filtered?.length && <Empty />}
    </>
  )
}
```

- [ ] **Step 4: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/handouts/HandoutSnapshot.tsx app/src/features/timeline/TimelineBlockCard.tsx app/src/features/timeline/ContentDrawer.tsx
git commit -m "feat(handouts): integrate handouts into timeline blocks and content drawer"
```

---

### Task 15: Tavern Menu Sections Editor

The tavern template needs a dynamic sections editor (add/remove sections, add/remove items with name+price). This is the most complex template-specific UI.

**Files:**
- Modify: `app/src/features/handouts/HandoutEditor.tsx`

- [ ] **Step 1: Add TavernSectionsEditor inline in HandoutEditor**

Add this component inside `HandoutEditor.tsx` (before the main export):

```tsx
function TavernSectionsEditor({ sections, onChange }: {
  sections: { name: string; items: { name: string; price: string }[] }[]
  onChange: (sections: { name: string; items: { name: string; price: string }[] }[]) => void
}) {
  const addSection = () => onChange([...sections, { name: '', items: [{ name: '', price: '' }] }])
  const removeSection = (i: number) => onChange(sections.filter((_, idx) => idx !== i))
  const updateSection = (i: number, name: string) => {
    const updated = [...sections]
    updated[i] = { ...updated[i], name }
    onChange(updated)
  }
  const addItem = (si: number) => {
    const updated = [...sections]
    updated[si] = { ...updated[si], items: [...updated[si].items, { name: '', price: '' }] }
    onChange(updated)
  }
  const removeItem = (si: number, ii: number) => {
    const updated = [...sections]
    updated[si] = { ...updated[si], items: updated[si].items.filter((_, idx) => idx !== ii) }
    onChange(updated)
  }
  const updateItem = (si: number, ii: number, field: 'name' | 'price', value: string) => {
    const updated = [...sections]
    const items = [...updated[si].items]
    items[ii] = { ...items[ii], [field]: value }
    updated[si] = { ...updated[si], items }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {sections.map((section, si) => (
        <div key={si} className="bg-bg-raised border border-border rounded-[--radius-md] p-2 space-y-1">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Section name (e.g. Ales & Meads)"
              value={section.name}
              onChange={(e) => updateSection(si, e.target.value)}
              className="flex-1 text-xs"
            />
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => removeSection(si)}>✕</Button>
          </div>
          {section.items.map((item, ii) => (
            <div key={ii} className="flex gap-1 items-center ml-2">
              <Input placeholder="Item" value={item.name} onChange={(e) => updateItem(si, ii, 'name', e.target.value)} className="flex-1 text-xs" />
              <Input placeholder="Price" value={item.price} onChange={(e) => updateItem(si, ii, 'price', e.target.value)} className="w-20 text-xs" />
              <button onClick={() => removeItem(si, ii)} className="text-xs text-danger cursor-pointer">✕</button>
            </div>
          ))}
          <button onClick={() => addItem(si)} className="text-xs text-primary cursor-pointer hover:underline ml-2">+ item</button>
        </div>
      ))}
      <button onClick={addSection} className="text-xs text-primary cursor-pointer hover:underline">+ section</button>
    </div>
  )
}
```

Then in the form fields section of the editor, add after the `establishment_name` field:

```tsx
{config.fields.includes('sections') && (
  <div>
    <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Menu Sections</label>
    <TavernSectionsEditor
      sections={(content.sections ?? []) as { name: string; items: { name: string; price: string }[] }[]}
      onChange={(sections) => updateContent('sections', sections)}
    />
  </div>
)}
```

- [ ] **Step 2: Add Broadsheet articles editor**

Add this component inside `HandoutEditor.tsx`:

```tsx
function ArticlesEditor({ articles, onChange }: {
  articles: { headline: string; body: string }[]
  onChange: (articles: { headline: string; body: string }[]) => void
}) {
  const addArticle = () => onChange([...articles, { headline: '', body: '' }])
  const removeArticle = (i: number) => onChange(articles.filter((_, idx) => idx !== i))
  const updateArticle = (i: number, field: 'headline' | 'body', value: string) => {
    const updated = [...articles]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      {articles.map((article, i) => (
        <div key={i} className="bg-bg-raised border border-border rounded-[--radius-md] p-2 space-y-1">
          <div className="flex gap-2 items-center">
            <Input placeholder="Headline" value={article.headline} onChange={(e) => updateArticle(i, 'headline', e.target.value)} className="flex-1 text-xs" />
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => removeArticle(i)}>✕</Button>
          </div>
          <textarea
            placeholder="Article body..."
            value={article.body}
            onChange={(e) => updateArticle(i, 'body', e.target.value)}
            className="w-full h-16 px-2 py-1 bg-bg-base border border-border rounded-[--radius-sm] text-text-body text-xs resize-vertical font-[inherit]"
          />
        </div>
      ))}
      <button onClick={addArticle} className="text-xs text-primary cursor-pointer hover:underline">+ article</button>
    </div>
  )
}
```

Add to the form after headline/ads fields:

```tsx
{config.fields.includes('articles') && (
  <div>
    <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Articles</label>
    <ArticlesEditor
      articles={(content.articles ?? []) as { headline: string; body: string }[]}
      onChange={(articles) => updateContent('articles', articles)}
    />
  </div>
)}
{config.fields.includes('ads') && (
  <div>
    <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Ads / Notices</label>
    <textarea
      value={(content.ads as string) || ''}
      onChange={(e) => updateContent('ads', e.target.value)}
      className="w-full h-16 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
      placeholder="Small ads, notices..."
    />
  </div>
)}
```

- [ ] **Step 3: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/handouts/HandoutEditor.tsx
git commit -m "feat(handouts): add tavern menu sections and broadsheet articles editors"
```

---

### Task 16: Final Wiring & Smoke Test

**Files:**
- Various (verify integration)

- [ ] **Step 1: Run type check**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run dev server and smoke test**

Run: `cd app && npm run dev`

Verify:
1. Handouts appears in sidebar after Locations
2. Can create a new handout (pick template, enter name)
3. Editor opens with form on left, preview on right
4. Changing text updates preview live
5. Template switching works
6. Font presets change the preview
7. Wax seal can be added, icon changed, colour changed, ring text works
8. Seal is draggable on preview
9. Export PNG downloads an image
10. Save persists to database
11. Back to grid shows the handout
12. Can delete a handout
13. Content Drawer in session timeline shows Handouts tab
14. Can add a handout to a timeline

- [ ] **Step 3: Run build**

Run: `cd app && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "feat(handouts): final wiring and fixes"
```
