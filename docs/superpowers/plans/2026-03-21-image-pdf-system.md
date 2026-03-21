# Image & PDF System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image uploads for PCs, NPCs, and locations (with class-based SVG placeholders), plus PDF file attachments for campaigns, all stored in Supabase Storage.

**Architecture:** Two Supabase Storage buckets (public images, private PDFs), client-side image compression via `browser-image-compression`, storage helpers in `src/lib/storage.ts`, a reusable `PortraitFrame` component with class-based SVG fallbacks, and a `CampaignFiles` section for PDF management.

**Tech Stack:** Supabase Storage + RLS, browser-image-compression, react-icons game-icons, TanStack Query mutations.

**Spec:** `docs/superpowers/specs/2026-03-20-image-pdf-system-design.md`

**Spec deviations:**
- `ImageUpload.tsx` from the spec is not a separate component — the file input is embedded directly in `PortraitFrame` and location cards, which covers all use cases without extra abstraction.
- `ContentDrawer.tsx` NPC portraits are deferred — adding portraits there requires reading the full ContentDrawer component to find the right insertion point. This can be done as a follow-up task.
- `uploadPdf` returns `{ path, size }` instead of `string` — the caller needs both values.

---

### Task 1: Database Migration — Storage Buckets, Columns, Tables

**Files:**
- Create: `supabase/migrations/20260321120000_storage.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260321120000_storage.sql`:

```sql
-- =============================================
-- Image & PDF Storage
-- =============================================

-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('campaign-pdfs', 'campaign-pdfs', false)
on conflict (id) do nothing;

-- Storage RLS: GM can manage their campaign's images
create policy "Campaign GM can manage images"
on storage.objects for all
using (
  bucket_id = 'campaign-images'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
)
with check (
  bucket_id = 'campaign-images'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
);

-- Storage RLS: GM can manage their campaign's PDFs
create policy "Campaign GM can manage pdfs"
on storage.objects for all
using (
  bucket_id = 'campaign-pdfs'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
)
with check (
  bucket_id = 'campaign-pdfs'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
);

-- Add portrait/image columns to existing tables
alter table player_characters add column if not exists portrait_url text;
alter table npcs add column if not exists portrait_url text;
alter table locations add column if not exists image_url text;

-- Campaign files table for PDFs and other attachments
create table if not exists campaign_files (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  file_type text not null default 'pdf',
  storage_path text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table campaign_files enable row level security;

create policy "GM can manage campaign files"
on campaign_files for all
using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
```

- [ ] **Step 2: Push migration**

Run from `app/` directory: `echo "Y" | npx supabase db push`
Expected: Migration applies successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260321120000_storage.sql
git commit -m "feat: add storage buckets, portrait columns, and campaign_files table"
```

---

### Task 2: Install browser-image-compression + Type Updates

**Files:**
- Modify: `package.json` (install dependency)
- Modify: `src/lib/types.ts:41-82` (add portrait_url to PlayerCharacter)
- Modify: `src/lib/types.ts:84-105` (add portrait_url to NPC)
- Modify: `src/features/locations/useLocations.ts:5-16` (add image_url to Location)
- Add new type CampaignFile to `src/lib/types.ts`

- [ ] **Step 1: Install browser-image-compression**

Run: `npm install browser-image-compression`

- [ ] **Step 2: Add portrait_url to PlayerCharacter type**

In `src/lib/types.ts`, add after `updated_at: string` in the PlayerCharacter type (around line 81):

```ts
  portrait_url: string | null
```

- [ ] **Step 3: Add portrait_url to NPC type**

In `src/lib/types.ts`, add after `updated_at: string` in the NPC type (around line 104):

```ts
  portrait_url: string | null
```

- [ ] **Step 4: Add CampaignFile type**

In `src/lib/types.ts`, add at the end of the file:

```ts
export type CampaignFile = {
  id: string
  campaign_id: string
  name: string
  file_type: string
  storage_path: string
  file_size: number | null
  created_at: string
}
```

- [ ] **Step 5: Add image_url to Location type**

In `src/features/locations/useLocations.ts`, add after `map_url: string | null` (line 12) in the Location type:

```ts
  image_url: string | null
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/types.ts src/features/locations/useLocations.ts
git commit -m "feat: add browser-image-compression, portrait/image types, CampaignFile type"
```

---

### Task 3: Storage Helpers — `src/lib/storage.ts`

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Create storage helper module**

Create `src/lib/storage.ts`:

```ts
import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

const MAX_IMAGE_SIZE_MB = 10
const MAX_PDF_SIZE_MB = 20

function generatePath(campaignId: string, folder: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
  const uuid = crypto.randomUUID()
  return `${campaignId}/${folder}/${uuid}.${ext}`
}

export async function uploadImage(
  campaignId: string,
  folder: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please select an image.')
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`)
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  })

  const path = generatePath(campaignId, folder, file.name)
  const { error } = await supabase.storage
    .from('campaign-images')
    .upload(path, compressed, { contentType: compressed.type })

  if (error) throw error

  const { data } = supabase.storage.from('campaign-images').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPdf(
  campaignId: string,
  file: File,
): Promise<{ path: string; size: number }> {
  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please select a PDF.')
  }
  if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
    throw new Error(`PDF too large. Maximum size is ${MAX_PDF_SIZE_MB}MB.`)
  }

  const path = generatePath(campaignId, 'pdfs', file.name)
  const { error } = await supabase.storage
    .from('campaign-pdfs')
    .upload(path, file, { contentType: 'application/pdf' })

  if (error) throw error
  return { path, size: file.size }
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('campaign-pdfs')
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add storage helpers for image compression, upload, and signed URLs"
```

---

### Task 4: Class Icons Mapping + Add Icons to Barrel

**Files:**
- Create: `src/components/ui/class-icons.ts`
- Modify: `src/components/ui/icons.ts`

- [ ] **Step 1: Add class portrait icons to icons.ts**

Add to the end of `src/components/ui/icons.ts` (before the closing):

```ts
// Class-based portrait icons
export { GiPanFlute } from 'react-icons/gi'          // Bard
export { GiPopeCrown } from 'react-icons/gi'         // Cleric
export { GiHighShot } from 'react-icons/gi'          // Ranger
export { GiSpellBook } from 'react-icons/gi'         // Wizard
export { GiFist } from 'react-icons/gi'              // Fighter
export { GiOakLeaf } from 'react-icons/gi'           // Druid
export { GiChoppedSkull } from 'react-icons/gi'      // Barbarian
export { GiPrayerBeads } from 'react-icons/gi'       // Monk
export { GiKnightBanner } from 'react-icons/gi'      // Paladin
export { GiBroadDagger } from 'react-icons/gi'       // Rogue
export { GiMagicPalm } from 'react-icons/gi'         // Sorcerer
export { GiWarlockEye } from 'react-icons/gi'        // Warlock
export { GiCog } from 'react-icons/gi'               // Artificer
```

**Note:** `GiHoodedFigure` is already exported from `icons.ts` (line 21) — do not add it again.

- [ ] **Step 2: Create class-icons.ts mapping**

Create `src/components/ui/class-icons.ts`:

```ts
import type { IconComponent } from './icons'
import {
  GiPanFlute, GiPopeCrown, GiHighShot, GiSpellBook, GiFist,
  GiOakLeaf, GiChoppedSkull, GiPrayerBeads, GiKnightBanner,
  GiBroadDagger, GiMagicPalm, GiWarlockEye, GiCog, GiHoodedFigure,
} from './icons'

const CLASS_ICONS: Record<string, IconComponent> = {
  bard: GiPanFlute,
  cleric: GiPopeCrown,
  ranger: GiHighShot,
  wizard: GiSpellBook,
  fighter: GiFist,
  druid: GiOakLeaf,
  barbarian: GiChoppedSkull,
  monk: GiPrayerBeads,
  paladin: GiKnightBanner,
  rogue: GiBroadDagger,
  sorcerer: GiMagicPalm,
  warlock: GiWarlockEye,
  artificer: GiCog,
}

export function getClassIcon(className: string | null): IconComponent {
  if (!className) return GiHoodedFigure
  return CLASS_ICONS[className.toLowerCase()] ?? GiHoodedFigure
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/icons.ts src/components/ui/class-icons.ts
git commit -m "feat: add D&D class-based portrait icon mapping"
```

---

### Task 5: PortraitFrame Component

**Files:**
- Create: `src/components/ui/PortraitFrame.tsx`

- [ ] **Step 1: Create PortraitFrame component**

Create `src/components/ui/PortraitFrame.tsx`:

```tsx
import { useRef } from 'react'
import { GameIcon } from './GameIcon'
import type { IconComponent } from './icons'

type PortraitSize = 'sm' | 'md' | 'lg'

interface PortraitFrameProps {
  imageUrl?: string | null
  fallbackIcon: IconComponent
  size?: PortraitSize
  uploading?: boolean
  onUpload?: (file: File) => void
  className?: string
}

const SIZE_MAP: Record<PortraitSize, { container: string; icon: 'sm' | 'lg' | 'xl' | '2xl' }> = {
  sm: { container: 'w-10 h-10', icon: 'lg' },
  md: { container: 'w-20 h-20', icon: 'xl' },
  lg: { container: 'w-[120px] h-[120px]', icon: '2xl' },
}

export function PortraitFrame({
  imageUrl,
  fallbackIcon,
  size = 'md',
  uploading = false,
  onUpload,
  className = '',
}: PortraitFrameProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const s = SIZE_MAP[size]

  const handleClick = () => {
    if (onUpload) inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUpload) {
      onUpload(file)
      e.target.value = ''
    }
  }

  return (
    <div
      className={`
        ${s.container} rounded-full shrink-0 relative
        border-2 border-primary-dim
        shadow-[0_0_12px_rgba(212,162,78,0.1)]
        flex items-center justify-center
        overflow-hidden
        transition-all duration-[--duration-normal]
        ${onUpload ? 'cursor-pointer hover:border-primary hover:shadow-[0_0_20px_rgba(212,162,78,0.25)]' : ''}
        ${className}
      `}
      onClick={handleClick}
      role={onUpload ? 'button' : undefined}
      aria-label={onUpload ? 'Upload portrait' : undefined}
    >
      {uploading ? (
        <div className="animate-pulse text-primary">
          <GameIcon icon={fallbackIcon} size={s.icon} />
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-primary-dim">
          <GameIcon icon={fallbackIcon} size={s.icon} />
        </div>
      )}

      {/* Upload overlay on hover */}
      {onUpload && !uploading && (
        <div className="absolute inset-0 rounded-full bg-bg-deep/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] text-text-muted font-label tracking-wider">UPLOAD</span>
        </div>
      )}

      {onUpload && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PortraitFrame.tsx
git commit -m "feat: add PortraitFrame component with image/icon display and upload"
```

---

### Task 6: Add Portraits to PCSheet + CharactersPage

**Files:**
- Modify: `src/features/characters/PCSheet.tsx:1-50`
- Modify: `src/features/characters/CharactersPage.tsx:73-77` (PC list items)
- Modify: `src/features/characters/CharactersPage.tsx:178-205` (NPC cards)
- Modify: `src/features/characters/useCharacters.ts` (add portrait update mutation)

- [ ] **Step 1: Add useUpdatePortrait to useCharacters.ts**

In `src/features/characters/useCharacters.ts`, add a new mutation after the existing `useUpdatePC`:

```ts
export function useUpdatePortrait() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ table, id, campaignId, url }: { table: 'player_characters' | 'npcs'; id: string; campaignId: string; url: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ portrait_url: url })
        .eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pcs', data.campaignId] })
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaignId] })
      useToastStore.getState().addToast('success', 'Portrait updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to update portrait')
    },
  })
}
```

- [ ] **Step 2: Add PortraitFrame to PCSheet header**

In `src/features/characters/PCSheet.tsx`, add imports:

```tsx
import { PortraitFrame } from '@/components/ui/PortraitFrame'
import { getClassIcon } from '@/components/ui/class-icons'
import { uploadImage } from '@/lib/storage'
import { useUpdatePortrait } from './useCharacters'
```

Add state and handler inside the PCSheet component (after the existing hooks around line 16):

```tsx
  const updatePortrait = useUpdatePortrait()
  const [uploadingPortrait, setUploadingPortrait] = useState(false)

  const handlePortraitUpload = async (file: File) => {
    setUploadingPortrait(true)
    try {
      const url = await uploadImage(campaignId, 'portraits', file)
      await updatePortrait.mutateAsync({ table: 'player_characters', id: pc.id, campaignId, url })
    } catch (err) {
      // toast shown by mutation error handler
    } finally {
      setUploadingPortrait(false)
    }
  }
```

Then in the JSX header section (line 37-38), add the portrait before the name div:

```tsx
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <PortraitFrame
              imageUrl={pc.portrait_url}
              fallbackIcon={getClassIcon(pc.class)}
              size="lg"
              uploading={uploadingPortrait}
              onUpload={handlePortraitUpload}
            />
            <div>
              <h4 className="text-lg text-text-heading">{pc.name}</h4>
```

Close the extra `<div>` after the existing player info section.

- [ ] **Step 3: Add small portraits to PC list in CharactersPage**

The PC list renders `<PCSheet>` directly (line 73-77), which already handles its own portrait. No separate list portrait needed since `PCSheet` is the list item.

For the **NPC cards** (NPCCard component around line 178), add a small portrait. Add imports at the top of `CharactersPage.tsx`:

```tsx
import { PortraitFrame } from '@/components/ui/PortraitFrame'
import { GiHoodedFigure } from '@/components/ui/icons'
```

In the NPCCard component (line 180-205), add a portrait before the name:

```tsx
function NPCCard({ npc, onDelete }: { npc: NPC; onDelete: () => void }) {
  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border p-4 group">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <PortraitFrame
            imageUrl={npc.portrait_url}
            fallbackIcon={GiHoodedFigure}
            size="sm"
          />
          <div>
            <h4 className="text-text-heading font-medium">{npc.name}</h4>
            <p className="text-xs text-text-secondary">
              {[npc.race, npc.occupation].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
```

The rest of the NPCCard stays the same.

- [ ] **Step 4: Type check and verify**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/characters/PCSheet.tsx src/features/characters/CharactersPage.tsx src/features/characters/useCharacters.ts
git commit -m "feat: add portrait frames to PC sheets and NPC cards"
```

---

### Task 7: Add Image Upload to Locations

**Files:**
- Modify: `src/features/locations/LocationsPage.tsx`
- Modify: `src/features/locations/useLocations.ts` (add image update mutation)

- [ ] **Step 1: Add useUpdateLocationImage to useLocations.ts**

Read `src/features/locations/useLocations.ts` first. Add a new mutation after existing mutations:

```ts
export function useUpdateLocationImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId, url }: { id: string; campaignId: string; url: string }) => {
      const { error } = await supabase
        .from('locations')
        .update({ image_url: url })
        .eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations', data.campaignId] })
      useToastStore.getState().addToast('success', 'Location image updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to update image')
    },
  })
}
```

- [ ] **Step 2: Add image display and upload to LocationNode**

In `src/features/locations/LocationsPage.tsx`, add imports at the top:

```tsx
import { uploadImage } from '@/lib/storage'
import { useUpdateLocationImage } from './useLocations'
```

In the `LocationNode` component (around line 114), add the image mutation hook and upload handler after the existing hooks:

```tsx
  const updateImage = useUpdateLocationImage()
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadImage(campaignId, 'locations', file)
      await updateImage.mutateAsync({ id: location.id, campaignId, url })
    } catch {
      // toast shown by mutation
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }
```

Also add `useRef` to the import from `'react'` at the top of the file.

In the expanded detail view (the non-editing branch, around line 166), add the image display before the description:

```tsx
              <div>
                {/* Location image */}
                {location.image_url && (
                  <img src={location.image_url} alt={location.name} className="w-full h-40 object-cover rounded-[--radius-md] mb-3" />
                )}

                {location.description && <p className="text-sm text-text-secondary mb-2">{location.description}</p>}
                {location.notes && <p className="text-xs text-text-muted mb-2">{location.notes}</p>}

                <LocationNPCList locationId={location.id} campaignId={campaignId} />

                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading...' : location.image_url ? 'Change Image' : 'Add Image'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteLocation.mutate({ id: location.id, campaignId })} className="text-danger hover:text-danger">Delete</Button>
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/locations/LocationsPage.tsx src/features/locations/useLocations.ts
git commit -m "feat: add image upload to location cards"
```

---

### Task 8: Campaign Files (PDF Upload + List)

**Files:**
- Create: `src/features/campaigns/useCampaignFiles.ts`
- Create: `src/features/campaigns/CampaignFiles.tsx`
- Modify: `src/features/campaigns/CampaignOverview.tsx`

- [ ] **Step 1: Create useCampaignFiles hook**

Create `src/features/campaigns/useCampaignFiles.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import { uploadPdf, getSignedUrl, deleteFile } from '@/lib/storage'
import type { CampaignFile } from '@/lib/types'

export function useCampaignFiles(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-files', campaignId],
    queryFn: async (): Promise<CampaignFile[]> => {
      const { data, error } = await supabase
        .from('campaign_files')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useUploadCampaignFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ campaignId, file }: { campaignId: string; file: File }) => {
      const { path, size } = await uploadPdf(campaignId, file)
      const { data, error } = await supabase
        .from('campaign_files')
        .insert({
          campaign_id: campaignId,
          name: file.name,
          file_type: 'pdf',
          storage_path: path,
          file_size: size,
        })
        .select()
        .single()
      if (error) throw error
      return data as CampaignFile
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-files', data.campaign_id] })
      useToastStore.getState().addToast('success', 'File uploaded')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Upload failed')
    },
  })
}

export function useDeleteCampaignFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId, storagePath }: { id: string; campaignId: string; storagePath: string }) => {
      await deleteFile('campaign-pdfs', storagePath)
      const { error } = await supabase.from('campaign_files').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-files', data.campaignId] })
      useToastStore.getState().addToast('success', 'File deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Delete failed')
    },
  })
}

export { getSignedUrl }
```

- [ ] **Step 2: Create CampaignFiles component**

Create `src/features/campaigns/CampaignFiles.tsx`:

```tsx
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiScrollUnfurled } from '@/components/ui/icons'
import { useCampaignFiles, useUploadCampaignFile, useDeleteCampaignFile, getSignedUrl } from './useCampaignFiles'

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CampaignFiles({ campaignId }: { campaignId: string }) {
  const { data: files, isLoading } = useCampaignFiles(campaignId)
  const uploadFile = useUploadCampaignFile()
  const deleteFileM = useDeleteCampaignFile()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile.mutate({ campaignId, file })
      e.target.value = ''
    }
  }

  const handleOpen = async (storagePath: string) => {
    try {
      const url = await getSignedUrl(storagePath)
      window.open(url, '_blank')
    } catch {
      // error handled by toast
    }
  }

  const handleDelete = (id: string, storagePath: string) => {
    if (window.confirm('Delete this file?')) {
      deleteFileM.mutate({ id, campaignId, storagePath })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl">Campaign Files</h3>
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploadFile.isPending}>
          {uploadFile.isPending ? 'Uploading...' : '+ Upload PDF'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {isLoading && <p className="text-text-muted text-sm">Loading files...</p>}

      {files && files.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <div className="text-2xl mb-2 text-text-muted"><GameIcon icon={GiScrollUnfurled} size="xl" /></div>
          <p className="text-text-secondary text-sm">No files uploaded yet.</p>
        </div>
      )}

      {files && files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="bg-bg-base rounded-[--radius-md] border border-border px-4 py-3 flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0">
                <GameIcon icon={GiScrollUnfurled} size="base" className="text-primary-dim shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-text-heading truncate">{f.name}</p>
                  <p className="text-xs text-text-muted">{formatFileSize(f.file_size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleOpen(f.storage_path)}>
                  Open
                </Button>
                <button
                  onClick={() => handleDelete(f.id, f.storage_path)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add CampaignFiles to CampaignOverview**

In `src/features/campaigns/CampaignOverview.tsx`, add import:

```tsx
import { CampaignFiles } from './CampaignFiles'
```

Add the CampaignFiles section after the initiative tracker section (before the `<CreateSessionDialog>`), around line 58:

```tsx
      <OrnamentalDivider />

      {/* Campaign files */}
      <div className="mb-8">
        <CampaignFiles campaignId={campaignId} />
      </div>
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/campaigns/useCampaignFiles.ts src/features/campaigns/CampaignFiles.tsx src/features/campaigns/CampaignOverview.tsx
git commit -m "feat: add campaign files section with PDF upload, open, and delete"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Type check**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Push migration**

Run: `echo "Y" | npx supabase db push`
Expected: Already applied (or applies cleanly if not done in Task 1).

- [ ] **Step 4: Full visual + functional check**

Open app in browser and verify:
- [ ] PC sheets show class-based SVG placeholder icons (Wizard → spell book, Fighter → fist, etc.)
- [ ] Clicking a PC portrait opens file picker
- [ ] Uploading an image shows loading state, then renders the uploaded image
- [ ] NPC cards show GiHoodedFigure placeholder
- [ ] Location cards support image upload
- [ ] Campaign Files section appears on campaign overview
- [ ] "Upload PDF" button opens file picker (accepts only PDFs)
- [ ] Uploaded PDFs appear in the list with name and size
- [ ] "Open" button opens PDF in a new tab via signed URL
- [ ] "Delete" button removes file from list and storage
- [ ] File too large (>20MB PDF) shows error toast
- [ ] Non-image file on portrait upload shows error toast
