# Phase 2 — Next Steps

What's been done, what's next, and what we said we'd come back to.

---

## Completed

### Icon Migration
- Replaced all 24 emojis across 22 files with game-icons.net SVGs via react-icons
- Centralised icon barrel at `src/components/ui/icons.ts`
- `GameIcon` wrapper component for consistent sizing
- D&D class → icon mapping (`class-icons.ts`) for PC portrait placeholders

### Visual Elevation
- Font stack upgraded: Cinzel (headings) + Crimson Pro (body) + Spectral SC (labels)
- Gold foil metallic gradient on campaign/session names
- Ornamental card corners on timeline blocks, campaign cards, PC sheets
- Ornamental dividers between page sections
- Vignette overlay (always on, darkens viewport edges)
- Paper grain noise texture (SVG feTurbulence, always on)
- Ambient floating embers (8 CSS-only particles, every page)
- Torch flicker animation on loading states

### Image & PDF System
- Supabase Storage: `campaign-images` (public) + `campaign-pdfs` (private)
- Client-side image compression (browser-image-compression, max 1MB/1920px)
- PC portrait upload with class-based SVG fallbacks
- NPC portrait display with hooded figure fallback
- Location image upload and display
- Campaign files section: PDF upload, list with open (signed URL) and delete
- Storage helpers in `src/lib/storage.ts`

### Web Clipper Chrome Extension
- Chrome Manifest V3 extension in `extension/` folder (standalone, no build step)
- Clip page URLs, selected text, or right-click images from any website
- Clips save directly to the Inspiration Board via Supabase
- Campaign picker dropdown (or Global Inbox)
- Tags and notes fields
- Supabase auth with session persistence via `chrome.storage.local`
- Clipped images are clickable back to source page
- Warm Craft themed popup

### Production Deployment
- GitHub repo: `github.com/athenoula/gm-book-of-tricks` (public)
- GitHub Pages: `athenoula.github.io/gm-book-of-tricks`
- Hash routing (`createHashHistory`) for static hosting compatibility
- Fixed `AnimatePresence mode="popLayout"` + `pointerEvents: none` on exit for production builds
- Inspiration items from clipper link back to source pages (title clickable for links, image clickable for images)

---

## Up Next — Remaining Phase 2 Roadmap

### Communications Hub
The big differentiator — send handouts, recaps, and reminders from inside the tool.

- **Discord webhooks** — send session reminders, recaps, handout images to a Discord channel. ~20 lines of code per webhook call via Supabase Edge Function. Store webhook URL per campaign. Add "Send to Discord" button on session recaps and timeline blocks.
- **Email via Resend** — styled session recap emails using React Email templates. Free tier: 100 emails/day, 3,000/month. Send from Supabase Edge Functions. Use cases: session recaps, pre-session reminders, player-specific handouts, between-session narrative hooks.
- **WhatsApp** — start with wa.me links (free, instant). Graduate to WhatsApp Cloud API for automated sending (1,000 free conversations/month). Can send images and PDFs.

### Maps & Handouts
- **Interactive campaign maps** — Leaflet.js (40KB, free) with uploaded map images as custom tiles. Clickable pins linked to location entities. SVG paths between locations (dotted = unexplored, solid = travelled). Inspired by LegendKeeper's Atlas.
- **Nested maps** — click a city pin to zoom into a city-level map.
- **Shareable handout system** — any timeline block, NPC card, location, or image packaged as a handout. One click sends to Discord/WhatsApp/email.
- **Region-based fog of war** — simplified version: click map regions to toggle visibility for players. CSS mask-image with soft edges. (Stretch goal — not full freeform fog painting.)

### Polish & Stretch Goals
- **Discord bot with slash commands** — `/recap`, `/roll`, `/lookup npc Gandalf`. Uses Discord interaction webhook endpoint on Supabase Edge Functions, no persistent server.
- **AI-generated character portraits** — integrate Leonardo.ai or similar free-tier API for on-demand portrait generation.
- **AI recap drafting** — generate session recaps from timeline notes.
- **Page transition animations** — View Transitions API or Framer Motion page-level transitions.
- **canvas-confetti** (~5KB) — celebration bursts on critical hits, level-ups.
- **Parchment spell cards** — spell display as physical-feeling cards with inner borders and parchment gradients.
- **Letter-style handouts** — parchment letters with drop caps and wax seals (CSS-only, demonstrated in the Phase 2 report).

---

## Deferred Items — Things We Said We'd Come Back To

These were identified during implementation and spec reviews but deliberately deferred:

### From Visual Elevation
- **Spectral SC label application** — the `--font-label` token is defined but not yet applied to specific UI elements (timeline block type badges, stat block headers, nav labels). The font loads; it just needs to be wired to the right elements.
- **Active combatant torch-flicker** — spec suggested applying `.torch-flicker` to the active combatant indicator in the initiative tracker. Not yet done.
- **Sidebar logo torch-flicker** — spec listed as optional. Not applied.
- **Aged image filter** — `filter: sepia(0.3) contrast(1.1) brightness(0.95)` on uploaded images for warmth. Mentioned in the report but not implemented.

### From Image & PDF System
- **ContentDrawer NPC portraits** — spec called for small portraits next to NPC items in the timeline sidebar (`ContentDrawer.tsx`). Deferred because it requires careful reading of the ContentDrawer component to find the right insertion point.
- **Orphaned storage file cleanup** — when a PC/NPC/location is deleted, the database row cascades but the Supabase Storage file remains. Currently, delete mutations should call `deleteFile()` in their `onSuccess` callback. A proper cleanup script or Edge Function would be better long-term.
- **In-app PDF viewer** — we chose "open in new tab" for simplicity. A built-in viewer with react-pdf or @react-pdf-viewer/core would allow bookmarks, annotations (stored as JSON overlays), and search. ~400KB library cost. Could be Phase 3.
- **General campaign image gallery** — we built per-entity images (portraits, location images) but not a browsable gallery of all campaign images. Would need a gallery page with react-photo-album + yet-another-react-lightbox.

### From the Phase 2 Report (Not Yet Designed)
- **Offline capability** — DMs run games in cafes, game stores, conventions. Service worker + local cache would be a significant differentiator.
- **Mobile-first session prep** — prep on the train. The app is responsive but not optimised for mobile-first workflows.
- **Player-facing portal** — data model supports it (campaign_members table, RLS-ready). No UI built.
- **Sound/ambiance integration** — ambient sound layers (Syrinscape-style). Would need audio API integration.

---

## Cost Summary

Everything currently runs at **$0/month** on free tiers:
- Supabase free tier (1GB storage, 2GB bandwidth)
- All libraries are open source
- No API keys or paid services required

First paid jump: **Supabase Pro at $25/month** when storage exceeds 1GB or you need image transforms.

Communications stack (when implemented):
- Discord webhooks: free forever
- Resend email: free up to 3,000/month
- WhatsApp Cloud API: free for 1,000 conversations/month

---

## Design Specs & Plans

All specs and plans are in `docs/superpowers/`:
- `specs/2026-03-20-visual-elevation-design.md`
- `plans/2026-03-20-visual-elevation.md`
- `specs/2026-03-20-image-pdf-system-design.md`
- `plans/2026-03-21-image-pdf-system.md`
- `specs/2026-03-21-web-clipper-design.md`
- `plans/2026-03-21-web-clipper.md`

The Phase 2 research report with visual demos: `phase-2-report.html` (open in browser)
