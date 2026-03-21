# Image & PDF System — Design Spec

## Context

Phase 2 adds file upload capabilities to GM Book of Tricks. Players characters, NPCs, and locations can have uploaded images (portraits/photos). PDFs (rulebooks, modules, handouts) can be uploaded as campaign file attachments. All files stored in Supabase Storage on the free tier (1GB storage, 2GB bandwidth/month).

## Decisions

- **Image scope**: PCs, NPCs, and Locations
- **PDF approach**: Upload as attachments, open in new tab (no in-app viewer)
- **Storage**: Single `campaign-assets` bucket with campaign-scoped folders
- **Compression**: Client-side via `browser-image-compression` (max 1MB, 1920px)
- **PC placeholders**: Class-based SVG icons from game-icons.net (react-icons)

---

## 1. Supabase Storage Setup

### Buckets

Two buckets — public for images (fast CDN access), private for PDFs (signed URLs required):

- **`campaign-images`** (public) — portraits and location images
- **`campaign-pdfs`** (private) — rulebooks, modules, handouts

Folder structure:
```
campaign-images/
  {campaignId}/
    portraits/    ← PC and NPC images
    locations/    ← Location images

campaign-pdfs/
  {campaignId}/
    {uuid}.pdf
```

### RLS Policy

```sql
-- Images bucket: GM can manage their campaign's images
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

-- PDFs bucket: GM can manage their campaign's PDFs
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
```

Uses `string_to_array(name, '/')` instead of `storage.foldername()` for cross-version Supabase compatibility.

### Migration

New migration file creates buckets, policies, columns, and table:

```sql
-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('campaign-pdfs', 'campaign-pdfs', false)
on conflict (id) do nothing;

-- Storage RLS policies
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
alter table player_characters add column portrait_url text;
alter table npcs add column portrait_url text;
alter table locations add column image_url text;

-- Campaign files table for PDFs and other attachments
create table campaign_files (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  file_type text not null default 'pdf',
  storage_path text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

-- RLS
alter table campaign_files enable row level security;

create policy "GM can manage campaign files"
on campaign_files for all
using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
```

---

## 2. Client-Side Image Compression

### Dependency

```bash
npm install browser-image-compression
```

~8KB gzipped. Runs in a Web Worker for non-blocking compression.

### Settings

```ts
{
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
}
```

Applied to all image uploads before sending to Supabase Storage.

---

## 3. Storage Helpers — `src/lib/storage.ts`

New file: `src/lib/storage.ts`

### Constants

```ts
const MAX_IMAGE_SIZE_MB = 10   // pre-compression limit (reject massive raw files)
const MAX_PDF_SIZE_MB = 20     // PDF upload limit
```

### Exports

- `uploadImage(campaignId: string, folder: string, file: File): Promise<string>` — validates size (<10MB pre-compression), validates MIME type (`file.type.startsWith('image/')`), compresses with `browser-image-compression`, uploads to `campaign-images/{campaignId}/{folder}/{uuid}.{ext}`, returns the public URL
- `uploadPdf(campaignId: string, file: File): Promise<string>` — validates size (<20MB), validates MIME type (`application/pdf`), uploads to `campaign-pdfs/{campaignId}/{uuid}.pdf`, returns the storage path (not public URL — PDFs are private)
- `deleteFile(bucket: string, path: string): Promise<void>` — removes file from storage
- `getPublicUrl(path: string): string` — returns the CDN URL for a public image path
- `getSignedUrl(path: string, expiresIn?: number): Promise<string>` — generates a time-limited signed URL for private PDF access (default 1 hour)

### Upload Flow

1. Validate file size and MIME type (throw descriptive error if invalid)
2. Generate a UUID filename to avoid collisions
3. For images: compress with `browser-image-compression`
4. Upload to appropriate Supabase Storage bucket
5. Return public URL (images) or storage path (PDFs)

### Error Handling

Upload errors show a toast via `useToastStore`. File validation errors ("File too large", "Invalid file type") are thrown before upload attempt.

---

## 4. Class-Based SVG Placeholders

When a PC has no `portrait_url`, display a class-based icon from game-icons.net:

| D&D Class | react-icons Component |
|-----------|----------------------|
| Bard | GiPanFlute |
| Cleric | GiPopeCrown |
| Ranger | GiHighShot |
| Wizard | GiSpellBook |
| Fighter | GiFist |
| Druid | GiOakLeaf |
| Barbarian | GiChoppedSkull |
| Monk | GiPrayerBeads |
| Paladin | GiKnightBanner |
| Rogue | GiBroadDagger |
| Sorcerer | GiMagicPalm |
| Warlock | GiWarlockEye |
| Artificer | GiCog |
| (default) | GiHoodedFigure |

NPCs default to `GiHoodedFigure`. Locations default to `GiPositionMarker`.

### Mapping File

New file: `src/components/ui/class-icons.ts`

Exports a `CLASS_ICONS` record mapping lowercase class name → IconComponent, plus a `getClassIcon(className: string | null): IconComponent` helper that does case-insensitive lookup with fallback to `GiHoodedFigure`.

Add the new icons to `src/components/ui/icons.ts`:
```ts
export { GiPanFlute } from 'react-icons/gi'
export { GiPopeCrown } from 'react-icons/gi'
export { GiHighShot } from 'react-icons/gi'
export { GiSpellBook } from 'react-icons/gi'
export { GiFist } from 'react-icons/gi'
export { GiOakLeaf } from 'react-icons/gi'
export { GiChoppedSkull } from 'react-icons/gi'
export { GiPrayerBeads } from 'react-icons/gi'
export { GiKnightBanner } from 'react-icons/gi'
export { GiBroadDagger } from 'react-icons/gi'
export { GiMagicPalm } from 'react-icons/gi'
export { GiWarlockEye } from 'react-icons/gi'
export { GiCog } from 'react-icons/gi'
```

---

## 5. Components

### `PortraitFrame.tsx`

New file: `src/components/ui/PortraitFrame.tsx`

Circular portrait display with ornamental border (reuses the portrait styling from the Phase 2 report). Shows either:
- An uploaded image (`<img>` with `object-cover` inside a circular clip)
- A class-based SVG icon as placeholder

Props:
```ts
interface PortraitFrameProps {
  imageUrl?: string | null
  fallbackIcon: IconComponent
  size?: 'sm' | 'md' | 'lg'    // 40px, 80px, 120px
  onUpload?: (file: File) => void  // if provided, clicking triggers file pick
  className?: string
}
```

Size map: `sm` = 40px (list items), `md` = 80px (cards), `lg` = 120px (character sheet header).

When `onUpload` is provided, the frame is clickable with a subtle camera/upload overlay on hover. During upload, show a loading spinner inside the frame (replace icon/image temporarily).

### Upload Progress

The `PortraitFrame` accepts an `uploading?: boolean` prop. When true, shows a pulsing amber ring animation instead of the image/icon. This provides feedback during compression + upload (typically 1-3 seconds).

### `ImageUpload.tsx`

New file: `src/components/ui/ImageUpload.tsx`

Reusable upload handler component. Not visible — wraps a hidden `<input type="file">` and exposes an imperative `trigger()` method via ref, or accepts a render prop / children pattern.

Props:
```ts
interface ImageUploadProps {
  accept?: string             // default 'image/*'
  onFileSelected: (file: File) => void
  children: (props: { trigger: () => void }) => React.ReactNode
}
```

### `CampaignFiles.tsx`

New file: `src/features/campaigns/CampaignFiles.tsx`

Campaign file manager section. Displays a list of uploaded PDFs with:
- File name
- File size (formatted)
- "Open" button (generates signed URL, opens new tab)
- "Delete" button (with confirmation)
- "Upload PDF" button at top

Uses a new hook `useCampaignFiles(campaignId)` for CRUD operations.

### `useCampaignFiles.ts`

New file: `src/features/campaigns/useCampaignFiles.ts`

TanStack Query hook following existing patterns:
- `useCampaignFiles(campaignId)` — fetches from `campaign_files` table
- `useUploadCampaignFile()` — mutation: uploads to storage, inserts DB row
- `useDeleteCampaignFile()` — mutation: deletes from storage and DB

---

## 6. Where Things Appear

### PC Portraits

**`PCSheet.tsx`** — Add `PortraitFrame` (size `lg`) at top of character sheet header, before the name. Clicking triggers upload. Upload calls `uploadFile(campaignId, 'portraits', file)` then updates the PC's `portrait_url`.

**`CharactersPage.tsx`** — Add `PortraitFrame` (size `sm`) in the character list items, before the name.

### NPC Portraits

**`ContentDrawer.tsx`** — In the NPC list items, show `PortraitFrame` (size `sm`) with `GiHoodedFigure` fallback.

### Location Images

**`LocationsPage.tsx`** — Add image display area on location cards. If `image_url` exists, show it as a card header image. If not, show `GiPositionMarker` placeholder. Click to upload.

### Campaign Files (PDFs)

**`CampaignOverview.tsx`** — Add `<CampaignFiles campaignId={campaignId} />` section after the initiative tracker, with an `OrnamentalDivider` above it.

---

## 7. Type Updates

**`src/lib/types.ts`:**

```ts
// Add to PlayerCharacter type:
portrait_url: string | null

// Add to NPC type:
portrait_url: string | null

// New type:
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

**`src/features/locations/useLocations.ts`:**

The `Location` type is defined in this file (not `types.ts`). Add `image_url` to it:
```ts
// Add to Location type (already has map_url for maps — image_url is for general location photos):
image_url: string | null
```

**Note on queries:** Both `useCharacters.ts` and `useLocations.ts` already use `.select('*')`, so they will automatically include the new columns. No query changes needed — only type updates.

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260320120700_storage.sql` | Storage bucket, RLS, columns, campaign_files table |
| `src/lib/storage.ts` | Upload/delete/URL helpers wrapping Supabase Storage |
| `src/components/ui/class-icons.ts` | D&D class → icon mapping |
| `src/components/ui/PortraitFrame.tsx` | Circular portrait with fallback icon + upload |
| `src/components/ui/ImageUpload.tsx` | Reusable file picker wrapper |
| `src/features/campaigns/CampaignFiles.tsx` | PDF file list + upload UI |
| `src/features/campaigns/useCampaignFiles.ts` | TanStack Query hooks for campaign_files |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/ui/icons.ts` | Add 13 class-based portrait icons |
| `src/lib/types.ts` | Add portrait_url to PlayerCharacter + NPC, add CampaignFile type |
| `src/features/locations/useLocations.ts` | Add image_url to Location type |
| `src/features/characters/PCSheet.tsx` | Add PortraitFrame to header |
| `src/features/characters/CharactersPage.tsx` | Add small PortraitFrame to list items |
| `src/features/locations/LocationsPage.tsx` | Add image display + upload to location cards |
| `src/features/timeline/ContentDrawer.tsx` | Add small portraits to NPC/PC items |
| `src/features/campaigns/CampaignOverview.tsx` | Add CampaignFiles section |
| `package.json` | Add browser-image-compression dependency |

---

## Verification

1. `npx tsc --noEmit` — type check passes
2. `npx vite build` — build succeeds
3. `echo "Y" | npx supabase db push` — migration applies
4. Upload a portrait for a PC → image appears in portrait frame
5. Upload a portrait for an NPC → image appears
6. Upload a location image → image appears on location card
7. Upload a PDF → appears in campaign files list, "Open" opens in new tab
8. Delete a file → removed from storage and UI
9. PC with no portrait shows class-based SVG icon
10. New PC with class "Wizard" shows GiSpellBook placeholder
11. Images are compressed (check file size in Supabase dashboard — should be ≤1MB)
12. RLS check: cannot access another user's campaign files via direct URL manipulation

## Known Limitations

- **Orphaned storage files**: When a PC/NPC/location is deleted (cascade), the database row is removed but the file in Supabase Storage remains. On the 1GB free tier, this will accumulate over time. Future cleanup: add a Supabase Edge Function or manual cleanup script. For now, delete mutations should call `deleteFile()` in their `onSuccess` callback when the entity has a portrait/image URL.
