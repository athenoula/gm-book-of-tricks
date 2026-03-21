# GM Book of Tricks v2

A web-based toolkit for tabletop RPG Game Masters. Handles session prep, initiative tracking, content management, and in-play reference — so the GM can focus on storytelling.

## Tech Stack

- **Build:** Vite 6
- **UI:** React 19
- **Routing:** TanStack Router (file-based, SPA)
- **Server state:** TanStack Query (caching, mutations, invalidation)
- **Client state:** Zustand (auth, sidebar, combat, toasts, command palette)
- **Styling:** Tailwind CSS 4 with custom design tokens via `@theme` in `index.css`
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + RLS + Storage)
- **Animations:** motion/react (Framer Motion v12)
- **Icons:** react-icons (game-icons.net SVGs via `Gi` prefix) — barrel at `src/components/ui/icons.ts`
- **Image compression:** browser-image-compression (client-side, max 1MB/1920px)
- **Drag & drop:** @hello-pangea/dnd
- **Markdown:** react-markdown
- **Deployment:** Static SPA (Vercel/Cloudflare Pages)

## Project Structure

```
src/
├── components/
│   ├── layout/        # CampaignLayout, Sidebar, MobileNav
│   ├── motion/        # FadeIn, SlideUp, ScaleIn, StaggerList, PageTransition
│   └── ui/            # Button, Input, Toast, CommandPalette, GameIcon, PortraitFrame,
│                      # OrnamentalDivider, AmbientEmbers, icons.ts, class-icons.ts
├── features/
│   ├── auth/          # LoginPage
│   ├── campaigns/     # HomePage, CampaignCard, CampaignOverview, CreateCampaignDialog,
│   │                  # CampaignFiles, useCampaignFiles
│   ├── characters/    # CharactersPage, PCSheet, SpellPicker, useCharacters, useCharacterSpells
│   ├── bestiary/      # BestiaryPage, useMonsters
│   ├── spellbook/     # SpellbookPage, useSpells
│   ├── generators/    # GeneratorsPage, NPCGenerator, EncounterGenerator, LootTableManager
│   ├── initiative/    # InitiativeTracker, CombatantRow, QuickAddPanel, AddCombatantForm, useBattles
│   ├── locations/     # LocationsPage, useLocations
│   ├── scratchpad/    # InspirationBoard, useInspiration
│   ├── sessions/      # SessionPage, SessionsPage, SessionList, CreateSessionDialog
│   └── timeline/      # SessionTimeline, SceneBlock, TimelineBlockCard, InlineBattle, ContentDrawer, MarkdownPreview
├── hooks/             # useCommandPaletteSearch
├── lib/               # supabase, auth, query, toast, command-palette, types, dnd, open5e, storage
└── routes/            # router.tsx
```

## Design Decisions

### Visual Direction: Warm Craft + Fantasy Elevation
- Dark but warm — charcoal (#1c1917) + amber (#f59e0b), not cold blue/grey
- Headings: Cinzel (serif, engraved fantasy feel)
- Display: Cinzel Decorative (hero headings only)
- Body: Crimson Pro (old-style serif, readable)
- Labels: Spectral SC (small caps for thematic labels like ARMOR CLASS)
- Code/stats: JetBrains Mono
- Font tokens registered in `@theme` block: `--font-display`, `--font-heading`, `--font-body`, `--font-label`, `--font-mono`
- Status colours: forest green (#52b788/#2d6a4f), rust red (#e07a5f/#9b2226)
- All design tokens in `src/index.css` via `@theme` block
- Reduced motion support via `prefers-reduced-motion`

### Visual Effects (Phase 2)
- **Gold foil headings** — `.gold-foil` CSS class for metallic gradient text (campaign/session names)
- **Ornamental corners** — `.ornamental-corners` CSS class for gold corner accents on cards (note: target elements must not use `::before`/`::after` for other purposes)
- **Torch flicker** — `.torch-flicker` CSS class for candlelight brightness animation (loading states)
- **Vignette overlay** — fixed div in App.tsx (z-60), darkens viewport edges
- **Paper grain** — fixed div in App.tsx (z-59), SVG feTurbulence noise at 2.5% opacity
- **Ambient embers** — `<AmbientEmbers />` component in App.tsx (z-1), CSS-only floating particles
- **Ornamental dividers** — `<OrnamentalDivider />` component for section separators

### Icons
- All UI icons are game-icons.net SVGs via `react-icons` package (`Gi` prefix)
- Centralised barrel file: `src/components/ui/icons.ts` — all icons imported from here, not directly from `react-icons/gi`
- `GameIcon` wrapper component provides consistent sizing (xs through 3xl)
- `IconComponent` type exported from icons.ts for typed icon props
- D&D class → icon mapping in `src/components/ui/class-icons.ts` with `getClassIcon()` helper

### File Storage
- **Supabase Storage** with two buckets: `campaign-images` (public) and `campaign-pdfs` (private, signed URLs)
- Storage helpers in `src/lib/storage.ts`: `uploadImage()`, `uploadPdf()`, `getSignedUrl()`, `deleteFile()`
- Images compressed client-side before upload (max 1MB, 1920px via browser-image-compression)
- PDFs limited to 20MB, opened via signed URLs in new tab
- `PortraitFrame` component for circular portrait display with class-based SVG fallbacks
- PC portraits use class-based icons (Wizard → spell book, Fighter → fist, etc.)

### Core Loop: Timeline-First
- Sessions and their timelines are the centre of gravity
- Campaign content (PCs, NPCs, monsters, spells, locations) feeds into session timelines
- Timelines mix scenes (markdown notes) with content blocks (monsters, NPCs, spells, locations, battles)
- Prep mode for editing, Play mode for running sessions

### Architecture Principles
- **Feature-based folders** — each feature owns its components, hooks, queries, types
- **Data fetching in hooks** — `useSpells()`, `useCombatants()`, etc. Components don't call Supabase directly
- **TanStack Query for server state** — queries, mutations, cache invalidation, optimistic display
- **Zustand for UI state only** — sidebar, combat state, toasts, command palette
- **Supabase Realtime** invalidates TanStack Query caches (initiative tracker)
- **No React Context for data** — Context only for providers
- **Small focused components** — no 400-line god components

### Data Model
- **System-aware PC model** — ability scores as JSONB (not 6 hardcoded columns)
- **Campaign membership table** — `campaign_members` for future player access
- **Normalised + JSONB** for SRD data — filterable columns + full JSON blob
- **Timeline blocks** embed content snapshots — no cross-table polymorphic references
- **Separate `pc_spells` and `npc_spells`** — FK-safe junction tables
- **Battle snapshots** as JSONB on timeline blocks — inline initiative tracker
- **Portrait/image URLs** — `portrait_url` on player_characters and npcs, `image_url` on locations
- **Campaign files** — `campaign_files` table for PDF attachments with storage_path references

### Player Views
- Data model is architected for players (campaign_members table, RLS-ready)
- No player UI built yet — GM-only tool for now

## Key Patterns

### Mutations
All mutations follow the same pattern:
```typescript
const mutation = useMutation({
  mutationFn: async (input) => {
    const { data, error } = await supabase.from('table').insert(input).select().single()
    if (error) throw error
    return data
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['table', data.campaign_id] })
    useToastStore.getState().addToast('success', 'Item created')
  },
  onError: (error: Error) => {
    useToastStore.getState().addToast('error', error.message || 'Something went wrong')
  },
})
```

### Motion Primitives
Use components from `@/components/motion`:
- `<StaggerList>` + `<StaggerItem>` for list entrances
- `<ScaleIn>` for modals/dialogs
- `<FadeIn>` / `<SlideUp>` for individual elements
- `<AnimatePresence>` for mount/unmount transitions
- `motion.button` with `whileTap={{ scale: 0.97 }}` for press feedback

### Supabase Migrations
Migrations are in `supabase/migrations/` with timestamp prefixes. Push with:
```bash
echo "Y" | npx supabase db push
```
The Supabase CLI is linked to the project. All migrations use RLS with `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`.

## Environment

- Node: 20.17.0
- Supabase project ref: `bytlbwwkglhfidrohneu`
- `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Path alias: `@/` → `src/`
- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Build: `npx vite build`

### z-index Hierarchy
- Embers: `z-[1]` (behind content)
- Content: default stacking
- Sidebar: `z-40`
- MobileNav: `z-40`
- Modals/CommandPalette: `z-50`
- Paper grain overlay: `z-[59]`
- Vignette overlay: `z-[60]`
- Toasts: `z-[70]`

## What NOT to Do

- Don't use Next.js patterns (server components, API routes) — this is a pure SPA
- Don't add new state management libraries — use TanStack Query + Zustand
- Don't hardcode D&D 5e assumptions into data models — keep system-aware
- Don't build player-facing UI yet — architect for it, don't build it
- Don't use generic/neon colours — stick to the Warm Craft palette (forest green, rust red, amber)
- Don't auto-save scene content with debounced timers — use explicit Save button (learned from debugging)
- Don't create separate component trees for Prep/Play modes — use same tree with `isDragDisabled` prop
- Don't import icons directly from `react-icons/gi` — use the barrel at `@/components/ui/icons`
- Don't use `::before`/`::after` on elements with `ornamental-corners` class — they're consumed by the corner effect
- Don't add `overflow-hidden` to cards with `ornamental-corners` — it clips the corner ornaments

## Workflow

- **Always use superpowers skills** for planning and implementation — brainstorm before building, write specs, write plans, use subagent-driven development for execution
- **Always use frontend-design skill** when building new UI components or pages — it ensures distinctive, high-quality visuals that match the Warm Craft + Fantasy aesthetic
- Follow the brainstorm → spec → plan → implement → review cycle for any non-trivial feature

## Phase 2 Progress & Next Steps

See `NEXT-STEPS.md` for the full roadmap of remaining Phase 2 features, deferred items, and future possibilities.
