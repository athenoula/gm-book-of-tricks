# GM Book of Tricks — v2 Briefing

## How to Use This Document

This is a briefing document written from the perspective of v1 of GM Book of Tricks. It captures everything worth carrying forward — the product vision, data model, feature inventory, lessons learned, and integration points — so that v2 can start fresh with full context. Three appendices at the end provide raw reference material: the complete TypeScript type definitions, the full database schema, and the git history.

**To use it:** present this document to Claude in a new repo and ask for a fresh reimagining of the product. There is no v1 code to port — this is a clean-slate rebuild.

**What's open to challenge:**
- Every architectural and technology decision. v1 used Next.js + Supabase + Tailwind; v2 doesn't have to.
- Feature scope and prioritisation. Some v1 features worked well, others didn't earn their complexity.
- The data model is mostly solid and battle-tested, but it's open to changes where you see a better approach.

**What is explicitly NOT carrying forward:**
- The visual design. v1's parchment-and-medieval aesthetic was a starting point, not a destination. v2 should develop its own design language from scratch.

**What we want from you:**
- Read this briefing, then propose a v2 architecture and plan.
- Feel free to challenge any decision documented here.
- Suggest new features, different tech choices, better patterns.
- Ask clarifying questions before building.

---

## 1. Product Vision

### What It Is

GM Book of Tricks is a web-based toolkit for Game Masters running tabletop RPG sessions. It handles the bookkeeping and reference-lookup that slows down play — initiative tracking, NPC management, spell lookups, session planning — so the GM can focus on storytelling.

### Who It's For

The primary user is a Game Master running D&D 5e (both the 2014 and 2024 rulesets). The app is built for GMs who want a lightweight digital tool at the table without the overhead of a full virtual tabletop like Roll20 or Foundry VTT.

Cross-system support for Pathfinder and other TTRPGs is a stated goal but has not yet been built in v1. The architecture should make this feasible without a ground-up rewrite.

### The Multi-Device Concept

A core design principle is that GM Book of Tricks runs across multiple devices simultaneously during a session:

- **GM on a laptop** — full campaign dashboard, session timeline, NPC and monster management, initiative control.
- **Players on their phones** — character sheets, initiative order, handouts and shared content pushed by the GM.

This means real-time sync is a first-class requirement, not an afterthought. In v1, Supabase Realtime handled this. v2 needs a similarly capable real-time layer, whatever the stack.

### Core Value Proposition

There are plenty of TTRPG tools. GM Book of Tricks occupies a specific niche:

- **Lightweight** — not a full VTT with maps, tokens, and voice chat. Just the GM's notebook and reference shelf, digitised.
- **Modern** — a clean web app, not a desktop program from 2008 or a spreadsheet with macros.
- **Works at the table** — designed for in-person play where the GM has a laptop and players have phones, not for remote-only sessions.
- **SRD-powered** — pulls spells, monsters, and class data from the Open5e API so the GM doesn't have to type everything manually.

### System Support

- **D&D 5e (2014 + 2024):** Primary system. Spells, monsters, classes, and character sheets are all built around 5e data structures.
- **Pathfinder / other TTRPGs:** Planned. The data model should be flexible enough to accommodate different rule systems without forking the codebase. v1 did not get here.

---

## 2. Feature Inventory

This is a comprehensive catalogue of everything v1 built, grouped by how well it worked. For each feature, there is enough detail that someone who has never seen the code understands what it does and how it works at a high level.

### Proven Concepts

These features work well. v2 should replicate the behaviour, though the code and architecture can be completely reimagined.

**Authentication (Supabase email/password)**
The landing page (`/`) is a sign-up/sign-in form using Supabase Auth. Email + password only — no OAuth providers. On successful login, the user is redirected to `/dashboard`. Auth state is checked client-side on protected pages; if no user is found, the page redirects to `/`. Sign-out clears the session and returns to login. Simple and functional.

**Campaign CRUD and dashboard (`/dashboard`)**
After login, the user sees all their campaigns sorted by last updated. Each campaign has a name, optional description, and a game system selector (D&D 5e 2024, 5e 2014, Pathfinder 2e, Pathfinder 1e, Other). Creating a campaign inserts a row with the current user as `gm_id`. The dashboard is a responsive card grid. Clicking a campaign navigates to `/campaign/[id]`.

**Initiative tracker**
The most mature feature. Lives inside the session page as a tab and can also be embedded in timeline blocks. Core functionality:
- **Add combatants manually:** name, initiative roll, HP, AC, and a PC/NPC toggle. There is a d20 button that generates a random roll.
- **Quick-add from campaign data:** a panel that lists all PCs, NPCs, and monsters saved to the campaign. Clicking "Add" creates a combatant with stats pulled from the source record, auto-rolls initiative (d20 + DEX mod for monsters, d20 + initiative bonus for PCs), and links back to the source via `source_type` and `source_id`.
- **Combat flow:** Start Combat highlights the first combatant. Next Turn advances through the sorted list (descending initiative) and increments the round counter when it wraps. End Combat deactivates highlighting.
- **HP tracking:** +/- buttons on each combatant, clamped between 0 and max HP. Combatants at 0 HP are visually dimmed.
- **D&D 5e conditions:** 16 conditions (Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious, Concentrating). Each has a colour-coded badge. Toggle on/off via a dropdown menu per combatant, or click the badge to remove.
- **Real-time sync:** Uses Supabase Realtime, subscribing to `postgres_changes` on the `combatants` table filtered by `campaign_id`. Any device viewing the same campaign sees combatant changes in real time.
- **Session scoping:** Combatants can be optionally scoped to a `session_id`, so different sessions can have independent initiative trackers.
- **Animated layout:** Uses Framer Motion (`motion/react`) `layout` animations so combatants smoothly reorder when initiative values change.

**Battle save/load**
Extends the initiative tracker with persistence:
- **Save as template:** Stores the combatant lineup with full HP and no conditions — good for reusable encounters (e.g., "Goblin Ambush" can be loaded in any session).
- **Save as save state:** Stores current HP, conditions, round number, active index, and combat status — good for pausing and resuming mid-combat.
- Both types store combatant data as a JSONB `combatant_data` array on a `battles` row. Loading a battle clears existing combatants for the session and re-inserts from the snapshot.
- Battles are scoped to a session and listed in the Load Battle panel with type labels and combatant counts.

**NPC generator**
A d20-based random NPC creation tool. The GM picks an archetype (e.g., "The Merchant", "The Scholar", etc.) from a grid of options, each with a description. Each archetype has a 20-row table with four columns: First Name, Last Name, Race, and Quirk.

The generator presents a large d20 button. Each click rolls a d20 with a visual animation (rapid random numbers for ~1 second before settling). The roll result selects a row in the next unselected column. The GM can also click any cell manually to override the roll. Once all four columns are selected, a summary card shows the generated NPC (e.g., "Theron Blackwood, Dwarf Merchant — 'Always counting coins'").

From the summary, the GM can optionally save the NPC to their campaign by adding HP, AC, and notes, which inserts a row into the `npcs` table.

Archetype data lives in `/src/data/npc-tables.ts` as a static TypeScript data file.

**Spellbook (Open5e SRD integration)**
Two modes of spell management:

1. **Bulk import:** A single button fetches all SRD spells from the Open5e API (paginated, ~1400+ spells), deduplicates against already-imported spells by `srd_slug`, and batch-inserts in chunks of 50. Progress is shown during fetch and save. This populates the campaign's spell library.

2. **Individual search:** An inline search panel that queries Open5e by name, level, school, and class. Results show spell name, level, school, casting time, concentration, and ritual status. Each result has a Save button that imports the spell to the campaign.

Saved spells are displayed in a filterable card grid. Filters include name text search, level (cantrip through 9), school (8 D&D schools), and class (8 classes). Each spell card shows summary info collapsed; clicking expands to show full detail including description, "At Higher Levels" text, components (with material description), and source document. Spells can be deleted from the campaign.

The full spell data from Open5e is stored in a `spell_data` JSONB column alongside normalised columns (name, level, school, casting_time, range, duration, concentration, ritual, components, classes) for filtering.

**Monster search and management**
Similar pattern to spells but without bulk import:
- **Search:** Real-time query to Open5e monsters API by name. Results show size, type, CR, HP, and AC. Save button imports the monster to the campaign.
- **Saved monsters:** Listed in a card grid showing name, size, type, CR, HP, AC, and source. Clicking a monster opens a full stat block display.
- **Stat block display:** A detailed, styled component showing all 5e stat block sections — ability scores (with calculated modifiers), AC, HP, hit dice, speed (including multi-mode like swim/fly), saving throws, skills, damage vulnerabilities/resistances/immunities, condition immunities, senses, languages, challenge rating, special abilities, actions, and legendary actions. Formatted to resemble a D&D stat block.
- The entire Open5e monster JSON is stored in a `stat_block` JSONB column for rendering.

**NPC CRUD**
Full create/read/update/delete for NPCs:
- **Create/edit form:** Fields for name, race, occupation, HP, AC, personality, appearance, and notes. Spell assignment via SpellPicker (see below).
- **List view:** Card grid showing name, race/occupation, HP/AC badges, personality, appearance, and notes.
- **Delete:** Available from the card with confirmation-free click.
- NPCs are scoped to a campaign via `campaign_id`.

**Character-spell assignment (SpellPicker)**
A reusable component for assigning spells to PCs or NPCs. Uses a polymorphic junction table (`character_spells`) with `character_id`, `character_type` ("pc" or "npc"), and `spell_id`. The picker shows:
1. Spells already assigned, grouped by level, with remove buttons.
2. A searchable list of campaign spells (already imported) to add.
3. An optional SRD search that imports and assigns in one step (save to campaign library, then create the junction row).

**Session management**
Sessions belong to campaigns and have: name, session number, scheduled date/time, status (upcoming/in_progress/completed), notes, and an optional Spotify playlist URL field.
- **Session list:** On the campaign dashboard, sessions are split into upcoming/in-progress (always visible) and completed (collapsible with animated expand/collapse). Each session card shows number, name, date, and status badge. Clicking navigates to the session page.
- **Session creation:** Form with name (required), session number, and scheduled date/time.
- **Status lifecycle:** Sessions progress through upcoming -> in_progress -> completed via a button on the session page.

**Session spells**
A session-specific spell reference. The GM can add spells from the campaign library to a session for quick reference during play. Uses a `session_spells` junction table. Shows a searchable picker and displays added spells as expandable cards.

### Keep but Rethink

These features have the right idea but need better execution in v2 — either the UX was clunky, the architecture was too complex, or the feature didn't go far enough.

**Session timeline (three-panel layout)**
The session page uses a tabbed interface with seven tabs: Scenes, Initiative, Spells, Monsters, Party, NPCs, and Battles. The "Scenes" tab (confusingly labelled "notes" internally) reveals a three-panel layout:

- **Timeline (centre):** A vertical list of "timeline blocks" — each block is a typed reference (scene, battle, NPC, monster, spell, or PC) that can be collapsed to a one-line summary or expanded to show full content. Blocks support drag-and-drop reordering via `@hello-pangea/dnd`. Each block type has a colour-coded left border and icon.
- **Inventory (right sidebar on desktop, drawer on mobile):** Lists all campaign entities (PCs, NPCs, battles, monsters, spells) with "+" buttons to add them to the timeline. Sections are collapsible.
- **Tab content (full-width for non-timeline tabs):** Other tabs render their content in full width, replacing the timeline view.

The concept is sound — a GM builds a session plan by dragging content into a timeline — but the architecture is complex. The `TimelineBlock` component uses a source cache to batch-fetch referenced entities across six different tables. The `SessionDashboard` orchestrates multiple CRUD operations across `timeline_blocks` and `scenes` tables. Scene creation simultaneously inserts a scene and a timeline block.

What to rethink: simplify the mental model. The tab-switching between "Scenes" (timeline view) and other tabs is confusing. The inventory sidebar duplicates content already available in other tabs. Consider whether the timeline should be the primary organising principle or just one view.

**Character sheets (PC creation and display)**
Full D&D 5e character creation and display:

- **Creation form (PCForm):** ~30 fields organised into sections — player contact info (name, email, phone, WhatsApp, Discord), basic info (name, race, class, subclass, level, background, alignment), ability scores (6 scores with editable inputs), saving throw proficiencies (toggle buttons for each ability), skills (click-to-cycle through unproficient/proficient/expertise for all 18 5e skills), combat stats (max HP, current HP, AC, speed, initiative bonus, proficiency bonus), spellcasting ability selector, spell assignment (SpellPicker), and roleplay fields (personality traits, ideals, bonds, flaws, backstory, appearance, notes).
- **Display (PCSheet):** Two-column layout showing ability scores, saving throws (with proficiency calculation), full skill list (with proficiency and expertise modifiers), combat stats (HP, AC, speed, initiative, proficiency, spell save DC), assigned spells grouped by level, and roleplay sections.
- **Party panel on campaign dashboard (PartyPanel + PartyCard):** Summary cards for each PC showing name, player name, level/race/class, HP, AC, and contact icons (email, phone, WhatsApp, Discord with copy-to-clipboard).

Functional but the form component is very large (315 lines, ~30 state variables). The player contact info section is useful but could be extracted. The skill and saving throw calculations are correct but hardcoded to 5e rules — cross-system support would need a different approach.

**Scene editor**
Scenes have a name, markdown content, and a status (upcoming/active/done that cycles on click). Two versions exist:

1. **SceneContent:** Full-featured standalone editor with debounced auto-save (2-second delay), save state indicator (idle/unsaved/saving/saved), edit/preview toggle, and flush-on-blur.
2. **TimelineSceneBlock:** Lightweight inline version for timeline embedding with edit/save/cancel buttons and automatic edit mode for empty scenes.

Both use **MarkdownPreview** for rendering, which uses `react-markdown` with custom styled components. Notably, blockquotes (`>`) render as "read-aloud" text with special styling — a common TTRPG convention for text the GM reads aloud to players.

The scene editor works but is underutilised — there is no scene list or scene management outside the timeline context (the standalone SceneEditor and SceneList were recently removed). Consider whether scenes should be a first-class entity with their own page, or purely inline in the timeline.

**Campaign dashboard as a hub**
The campaign page (`/campaign/[id]`) shows a two-column grid: party panel on the left, sessions list on the right, and a row of tool links at the bottom (NPCs, Monsters, Spellbook, Generator). Each tool link navigates to a dedicated page.

This works as a navigation hub but doesn't surface enough useful information at a glance. Consider making the dashboard more of a "GM's desk" — showing upcoming session info, recent activity, quick-access to common actions, or campaign-level stats.

### Explore Fresh

These features were planned but not built, or exist only as schema stubs. They represent the aspirational roadmap for v2.

**Player views and handout sharing**
Not built. The multi-device concept (GM on laptop, players on phones) is central to the product vision, but v1 has no player-facing views. Players cannot see the initiative order, their character sheet, or handouts shared by the GM. This is the biggest gap between vision and execution.

**PDF import and AI extraction**
Not built. The original plan was to parse character sheets and source material from PDFs using pdf.js and structure the data with AI extraction. No code exists for this.

**Maps and locations**
Not built. No map display, location management, or spatial tools. The schema has no tables for this.

**Visual design system**
v1 uses a parchment-and-medieval aesthetic with custom CSS variables for colours (ink, parchment, gold, brandy, etc.), Google Fonts (Cinzel, Cinzel Decorative, Crimson Text), RPG Awesome icon font, particle effects (ember and dust variants via tsparticles), and hand-crafted UI patterns (tome-page, dark-wood-bar, card-hover, etc.). While atmospheric, this is explicitly not carrying forward. v2 should develop its own design language.

**Mobile experience**
The app is responsive (Tailwind breakpoints, flex-wrap patterns, mobile drawer for inventory) but not mobile-first. The initiative tracker has 44px touch targets. The session tabs hide labels on mobile, showing only icons. The CampaignTabs component has both a desktop vertical sidebar and a mobile bottom navigation bar. However, the overall experience is designed desktop-first with mobile as an adaptation, not a primary target.

**Spotify/music integration**
The `sessions` table has a `spotify_playlist_url` field, and the session page renders it as a simple external link if present. No actual Spotify embed, playback control, or deep integration exists. This was a "nice to have" idea that never went beyond a schema field and a link.

**Framer Motion animation layer**
v1 uses `motion/react` (Framer Motion) extensively: page transitions (fade-in + slide-up), staggered list animations for card grids, AnimatePresence for form show/hide, motion layout animations for initiative reordering, hover/tap scale effects on tool cards, and a d20 roll pulse animation. These add polish but are tightly coupled to the component tree — v2 should decide on an animation strategy early rather than adding it piecemeal.

**RPG Awesome icon library**
v1 uses the RPG Awesome icon font via a `RpgIcon` wrapper component. Icons include swords, shields, dragons, books, scrolls, dice, footprints, hearts, etc. This gives the UI a strong fantasy flavour. v2 should consider whether to keep this library or use a more generic icon set, depending on the visual direction.

**UI primitives**
v1 built several reusable UI components that v2 may want equivalents of:
- **MobileDrawer:** Slide-in panel from left or right, with overlay, used for the inventory sidebar on mobile. Prevents body scroll when open.
- **PageTransition:** Fade-in + slide-up wrapper using Framer Motion.
- **StaggeredList/StaggeredItem:** Wrapper that staggers the entrance animation of child items.
- **ParticleBackground:** Decorative canvas particles (ember and dust variants) using tsparticles.
- **MarkdownPreview:** Renders markdown with custom TTRPG-flavoured styling, including read-aloud blockquotes.

**Notes panel (legacy)**
A `NotesPanel` component exists that was part of an earlier session layout (before the timeline rewrite). It shows a three-column layout with a textarea for session notes (with auto-save on blur), battle link insertion, and a sidebar listing PCs and NPCs with click-to-view-in-modal. Character viewing opens a fixed overlay with the full PC sheet or NPC detail. This component is no longer used in the main flow but still exists in the codebase.

**CampaignTabs (legacy)**
A `CampaignTabs` component with desktop sidebar and mobile bottom nav exists but is not currently used in any page. It was part of an earlier campaign page layout that used tabs for initiative, PCs, NPCs, monsters, spells, and generator. The current campaign page uses a simpler navigation approach with tool link cards.

---

## 3. Data Model

### Entity Relationships

```
Campaign (root)
├── Session
│   ├── Scene (markdown content, sort_order, status)
│   ├── Battle (template or save_state, JSONB combatant snapshots)
│   ├── TimelineBlock (polymorphic: block_type + source_id)
│   └── Combatant (initiative tracker, polymorphic: source_type + source_id)
├── PlayerCharacter (full D&D 5e sheet)
├── NPC (lightweight stats + personality)
├── Monster (SRD or homebrew, full stat block as JSON)
└── Spell (SRD or homebrew)

CharacterSpell (junction: character_id + character_type → PC or NPC)
SessionSpell (junction: session_id + spell_id, unique constraint)
```

Campaign is the root of the ownership hierarchy. Every entity belongs to a campaign, and every campaign belongs to a GM (`gm_id` references `auth.users`). This is what makes RLS straightforward — every policy ultimately checks `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`.

Sessions sit one level below campaigns and act as the organising unit for play. Scenes, battles, timeline blocks, and combatants all belong to a session (and denormalize `campaign_id` for simpler RLS). Combatants optionally belong to a session — the `session_id` column was added after initial creation and allows `NULL`, meaning a combatant can exist at the campaign level without session scoping. This was a pragmatic choice but means the initiative tracker has two modes (session-scoped and campaign-global) that the UI has to handle.

PCs, NPCs, monsters, and spells belong directly to campaigns, not sessions. They are campaign-level entities that can be referenced from any session. This is the right call — you define your party and creature library once, then pull from it during sessions.

### How the Tables Work

**Campaign and Session** are standard parent-child with `ON DELETE CASCADE`. Sessions have a status lifecycle (`upcoming` -> `in_progress` -> `completed`) and optional scheduling, notes, and a Spotify URL field that was never meaningfully used.

**PlayerCharacter** is the largest table — 40+ columns covering the full D&D 5e character sheet. Ability scores are individual integer columns (not JSONB), which makes queries and sorting easy but means the schema is deeply coupled to D&D 5e's six-ability model. Proficiencies, skills, and expertises are `text[]` arrays. Equipment, class features, and traits are `JSONB` arrays of objects. Spell slots and prepared spells are also JSONB. Player contact info (name, email, phone, WhatsApp, Discord) was added in a later migration as separate columns.

**Opinion:** The flat column approach for ability scores worked well — no need to unpack JSON for common operations. But the mix of `text[]` for proficiencies and `jsonb` for equipment is inconsistent. v2 should pick one approach for structured sub-data and stick with it. The player contact fields are useful but probably belong on a separate `player` or `user_profile` entity rather than the character sheet, especially once player auth exists.

**NPC** is intentionally lightweight — name, race, occupation, personality, appearance, notes, and a `stats` JSONB blob for optional HP/AC/ability scores. NPCs don't have the full stat block treatment that monsters get. The `campaign_id` column is nullable, which is unusual and may have been an oversight — every other entity requires a campaign.

**Monster** follows the "normalised summary + JSONB detail" pattern. Key fields like name, size, type, CR, AC, HP, and speed are extracted into proper columns for filtering and display, while the full Open5e JSON is stored in `stat_block` JSONB for rendering the complete stat block. The `source` column distinguishes SRD imports from homebrew. The `srd_slug` column enables deduplication during import.

**Spell** uses the same normalised-plus-JSONB pattern as Monster. Filterable columns (name, level, school, casting_time, range, duration, concentration, ritual, components, classes) sit alongside a `spell_data` JSONB column holding the full Open5e response.

**Opinion:** The normalised-plus-JSONB pattern is one of the best decisions in the v1 schema. It gives you fast, indexable filtering on the columns you actually query by, while the JSONB blob preserves the complete upstream data without needing to model every field. v2 should keep this pattern for any SRD-sourced data.

**Battle** stores encounter state. The `type` column distinguishes templates (reusable encounter setups) from save states (mid-combat snapshots). Combat state — round number, active combatant index, whether combat is active — lives on the battle row. The combatant lineup is stored as a `combatant_data` JSONB array of `CombatantSnapshot` objects (name, initiative, HP, AC, conditions, source reference).

**Opinion:** Denormalizing combatants into JSONB on the battle row was the right trade-off. Battles are snapshots — they need to capture a moment in time, not maintain live foreign keys to entities that might change. Loading a battle means deserializing one JSON array, not joining across multiple tables. The downside is that if a monster's stats change after a battle is saved, the snapshot is stale — but that is correct behaviour for a save state.

**Combatant** is the live initiative tracker entity. Each row represents one creature in the current initiative order. The `source_type` / `source_id` pair links back to the original PC, NPC, or Monster record (see polymorphic patterns below). The `conditions` column is a `text[]` array of D&D 5e condition names. `session_id` was added later and references `sessions` with `ON DELETE SET NULL`.

**Scene** holds markdown content for session planning. Scenes are ordered by `sort_order` within a session and have a status lifecycle (`upcoming` -> `active` -> `done`). The `campaign_id` is denormalized from the session for simpler RLS. There is a composite index on `(session_id, sort_order)` for fast ordered lookups.

**TimelineBlock** is a polymorphic pointer table. Each row represents one block in the session timeline, referencing a source entity via `block_type` + `source_id`. The `block_type` column constrains to six values: `scene`, `battle`, `npc`, `monster`, `spell`, `pc`. The `source_id` is a bare UUID with no foreign key constraint — orphan cleanup is handled at the application level. Blocks have `sort_order` for drag-and-drop ordering and `is_collapsed` for UI state. There is a composite index on `(session_id, sort_order)`.

**SessionSpell** is a simple junction table linking spells to sessions for quick reference during play. It has a `UNIQUE(session_id, spell_id)` constraint to prevent duplicates.

**CharacterSpell** is a polymorphic junction table linking spells to either PCs or NPCs. The `character_type` column (`'pc'` or `'npc'`) determines which table `character_id` points to. There is a `CHECK` constraint on `character_type` but no foreign key on `character_id` (it can't reference two tables). The `is_prepared` boolean tracks whether the spell is currently prepared.

### Polymorphic Patterns

v1 uses polymorphic references in three places. Each trades referential integrity for flexibility.

**Combatant.source_type / source_id**
Links a combatant in the initiative tracker to its source record: a PlayerCharacter (`'pc'`), NPC (`'npc'`), or Monster (`'monster'`). Both columns are nullable — manually-added combatants have no source. This works well in practice: the quick-add panel pulls stats from the source, auto-rolls initiative, and sets the source reference so the UI can show a "view source" link. The main pain point is that there is no FK constraint, so if a PC or monster is deleted, the combatant keeps a dangling `source_id`. The application does not currently handle this gracefully.

**TimelineBlock.block_type / source_id**
Links a timeline block to any of six entity types. This is the most aggressive use of polymorphism in the schema. The comment in the migration is honest: "No FK constraint possible; orphan cleanup is handled at the application level." In practice, loading a timeline requires a batch fetch across up to six different tables to resolve all the source references, which the frontend handles with a source cache. This works but adds complexity — the `TimelineBlock` component needs to know how to render all six entity types.

**Opinion:** The timeline's polymorphism is the source of the most architectural pain in v1. Every new entity type that might appear in the timeline requires changes to the block_type check constraint, the source cache loader, the block renderer, and the inventory sidebar. Consider whether v2 should use a different approach — perhaps timeline blocks should embed their content (like battles embed combatant data) rather than referencing it, or perhaps the timeline should only support a smaller set of block types.

**CharacterSpell.character_type / character_id**
Links a spell to either a PC or NPC. The simplest of the three polymorphic patterns, and the least problematic. The `character_type` check constraint limits values to `'pc'` and `'npc'`. The RLS policy for `character_spells` traces ownership through the spell to the campaign to the GM, which works but means the query planner has to do a two-hop join for every row check.

**Opinion:** This pattern is fine for a junction table with low row counts per character. If v2 adds more character types or higher spell volumes, consider splitting into `pc_spells` and `npc_spells` — simpler, FK-safe, and the "duplication" is trivial for a junction table.

### Access Control (RLS)

Every table has Row Level Security enabled. All policies follow the same pattern: the current authenticated user (`auth.uid()`) must be the `gm_id` of the campaign that owns the record.

**Direct ownership tables** (campaigns, player_characters, monsters, spells, sessions, scenes, battles, timeline_blocks) use:
```sql
USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()))
```
Tables that have both read and write operations include a matching `WITH CHECK` clause.

**Junction tables** (character_spells, session_spells) trace ownership through their parent:
- `character_spells`: checks that the `spell_id` belongs to a spell in a campaign owned by the current user (two-hop join through spells and campaigns).
- `session_spells`: checks that the `session_id` belongs to a session in a campaign owned by the current user (two-hop join through sessions and campaigns).

**Combatants** have RLS enabled but the policy was applied manually via the SQL editor and is not captured in the migration files. Based on the pattern, it almost certainly uses the same `campaign_id` check.

**What is not implemented:** Player access. All policies are GM-only — there is no concept of a player user who can see their own character sheet, the initiative order, or shared handouts. The intent is that v2 would add player-facing policies, likely checking a `player_id` column on `player_characters` or a campaign membership table. This is the biggest gap in the access control model.

**Opinion:** The RLS pattern is clean and consistent. The subquery approach (`campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`) is easy to reason about and works for the current single-user (GM-only) model. For v2, adding player access will require either a campaign membership table (mapping users to campaigns with roles) or per-table player columns. The membership table approach is more flexible and avoids scattering player references across every table.

---

## 4. Tech Stack & Integration Patterns

### What v1 Used and Why

These are the technology choices v1 made and the reasoning behind them. v2 is not bound by any of these — they are context, not constraints.

**Next.js 16 (App Router)**
Chosen for file-based routing, React Server Components, and the ability to colocate API logic with pages. v1 uses the App Router exclusively (no Pages Router). In practice, most components are client-side (`'use client'`) because of the heavy use of state, Supabase subscriptions, and animations. The server component model was underutilised.

**React 19**
Used via Next.js 16. No React 19-specific features (Actions, `useOptimistic`, `use`) were adopted — v1 stuck to conventional `useState`/`useEffect` patterns throughout.

**Tailwind CSS 4**
Utility-first styling. All components use Tailwind classes directly — there is no component library (no shadcn, no MUI, no Chakra). Custom CSS variables define the fantasy theme colours (ink, parchment, gold, brandy, etc.). This worked well for rapid development but the visual design is not carrying forward, so the theme layer is disposable.

**Supabase (PostgreSQL + Auth + Realtime)**
The heaviest dependency. Supabase provides three things in one package:
1. **Auth:** Email/password authentication with `auth.uid()` for RLS policies. No OAuth providers were configured.
2. **Database:** PostgreSQL with a full migration history, JSONB columns for flexible data, and Row Level Security on every table.
3. **Realtime:** Used for the initiative tracker — the `combatants` table is added to the `supabase_realtime` publication, and the frontend subscribes to `postgres_changes` events filtered by `campaign_id`.

The integrated nature of Supabase was a major advantage — auth, database, and real-time sync from a single SDK. The downside is tight coupling: the Supabase client is imported directly in dozens of components, and switching to a different backend would touch almost every file.

**Vercel**
Deployment platform. No special Vercel features (Edge Functions, KV, Blob) were used — it is a straightforward Next.js deployment.

**Open5e API (`https://api.open5e.com/v1`)**
Free SRD content for D&D 5e monsters and spells. This is a read-only external API — v1 never writes to it. The integration pattern is: fetch from Open5e, display results, and if the user wants to keep something, save it to Supabase under the campaign. The API is paginated (default page size varies, v1 requests `limit=20` for search and `limit=100` for bulk fetch). The API was reliable during development but has no SLA — v2 should consider caching or a local SRD data fallback.

**Motion (`motion/react`, Framer Motion successor)**
Used for page transitions, staggered list animations, layout animations (initiative reordering), hover/tap effects, and AnimatePresence for mount/unmount transitions. The library is used in many components but always for presentational polish, never for core functionality.

**@hello-pangea/dnd**
Drag-and-drop library used for timeline block reordering. A single usage point — the timeline panel. It is a maintained fork of `react-beautiful-dnd`.

**RPG Awesome**
Fantasy-themed icon font providing swords, shields, dragons, books, scrolls, dice, and similar icons. Used via a `RpgIcon` wrapper component. Adds flavour but is tied to v1's medieval aesthetic.

**Other dependencies:**
- `react-markdown` — renders markdown in scene content and spell descriptions, with custom styled components (including "read-aloud" blockquote styling).
- `@tsparticles/react` + `@tsparticles/slim` — decorative particle effects (embers, dust). Purely cosmetic.

### Open5e API Integration Patterns

The Open5e integration lives in `src/lib/open5e.ts` and follows a consistent pattern across monsters and spells.

**Monster search**
```
GET /v1/monsters/?search={query}&limit=20&format=json
```
Returns paginated results. The frontend displays the `results` array. Each monster result includes size, type, CR, HP, AC, and the full stat block. Individual monsters can be fetched by slug: `GET /v1/monsters/{slug}/?format=json`.

**Spell search (multi-filter)**
```
GET /v1/spells/?search={name}&level_int={level}&school={school}&dnd_class={class}&limit=20&format=json
```
All filter parameters are optional — the query builds dynamically from whichever filters the user has set. This enables searches like "all 3rd-level evocation spells" or "all wizard cantrips".

**Bulk spell fetch (paginated crawl)**
```
GET /v1/spells/?limit=100&format=json  →  follow `next` URL until null
```
Fetches all SRD spells (~1400+) by following the `next` pagination link. Accepts an `onProgress` callback that reports `(loaded, total)` counts, enabling a progress indicator in the UI. Used for the "Import All SRD Spells" feature.

**General pattern: API → display → save to Supabase**
Open5e is treated as a search/browse layer. The user queries the API, reviews results, and explicitly saves items to their campaign. Once saved, the full API response is stored in a JSONB column (`stat_block` for monsters, `spell_data` for spells) alongside normalised columns for filtering. After import, the app reads from Supabase — it never re-fetches from Open5e for saved content.

### Supabase Integration Patterns

**Client setup**
A single client-side Supabase client is created in `src/lib/supabase.ts` using environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). This client is imported throughout the app for auth, CRUD, and real-time subscriptions. There is no server-side Supabase client — all database operations happen client-side through the anon key with RLS enforcing access control.

**Auth flow**
`supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` on the landing page. `supabase.auth.getUser()` checks on protected pages, redirecting to `/` if no session. `supabase.auth.signOut()` clears the session.

**CRUD operations**
Standard Supabase query builder pattern: `supabase.from('table').select()`, `.insert()`, `.update()`, `.delete()`. Filters use `.eq()`, `.in()`, `.order()`. No stored procedures or RPC calls — all logic is in the application layer.

**Realtime (initiative tracker)**
The `combatants` table is added to the Supabase Realtime publication. The frontend subscribes to a channel filtered by `campaign_id`:
- Listens for `INSERT`, `UPDATE`, and `DELETE` events on `postgres_changes`.
- On any event, the local combatant list is refreshed.
- This enables multi-device sync: one GM updates HP on a laptop, another device sees the change within ~50-200ms.

This is the only table with Realtime enabled in v1. Adding Realtime to other tables (e.g., scenes for collaborative editing, or a future "player view" for initiative display) would follow the same pattern.

### D&D Mechanics Helpers

`src/lib/helpers.ts` contains pure functions for D&D 5e game mechanics. These are small, well-tested utilities that any D&D-focused app would need.

**Ability modifier calculation**
`(score - 10) / 2` rounded down (using `Math.floor`). Standard D&D formula. A score of 10-11 gives +0, 14-15 gives +2, 8-9 gives -1, etc.

**Proficiency bonus by level**
Lookup by level range: levels 1-4 give +2, 5-8 give +3, 9-12 give +4, 13-16 give +5, 17+ give +6. This follows the standard D&D 5e progression.

**Skill-to-ability mapping**
A static map of all 18 D&D 5e skills to their governing ability score (e.g., Acrobatics → Dexterity, Arcana → Intelligence, Persuasion → Charisma). Used by the character sheet to calculate skill modifiers from ability scores and proficiency.

**d20 rolling**
`Math.floor(Math.random() * 20) + 1`. Used for initiative rolls and the NPC generator. Not cryptographically random — fine for a GM tool, not suitable for competitive play.

**Modifier formatting**
Converts a numeric modifier to display format: positive values get a `+` prefix ("+2"), negative values display as-is ("-1").

**Ability abbreviation**
Converts full ability names to three-letter uppercase abbreviations ("strength" → "STR"). Used in stat block and character sheet displays.

**Note for v2:** These helpers are D&D 5e-specific. If v2 supports multiple rule systems, these calculations would need to be abstracted behind a system-specific interface — different games have different modifier formulas, skill lists, and progression tables.

---

## 5. Design Evolution

This section traces how design decisions evolved during v1. The specific visual choices are not carrying forward, but the decision trajectory reveals what the product needs from its design system and where complexity emerged.

### Visual Theme: Three Iterations

The visual direction went through three distinct phases, each one a reaction to lessons from the previous:

1. **Light/dark toggle with Canva moodboard palette.** The initial spec proposed a 12-colour palette extracted from a Canva moodboard, with semantic CSS tokens that swapped values between light and dark modes. Two page layouts were planned: a "bulletin board" style for the dashboard (parchment cards pinned with faux tape on a textured wall) and a "ledger" style for functional pages (lined-paper background, forest-green sidebar). A Canva Connect API export pipeline was designed to pull hand-drawn assets (ribbon banners, decorative icons, background textures, card frames) directly from Canva into the project. The theme toggle was a three-state cycle: System, Light, Dark.

2. **Single dark fantasy theme ("Leather Tome").** The light/dark toggle was dropped in favour of a single cohesive dark theme. The rationale: maintaining two modes doubled the styling surface area for minimal user benefit, and the dark leather-and-parchment aesthetic was more atmospheric. Textures were simplified to three layers — worn leather for page backgrounds, crumpled parchment for content cards, dark wood grain for the header bar. A vignette overlay added depth. The font stack was consolidated from MedievalSharp to Cinzel (headings) + Cinzel Decorative (display) + Crimson Text (body), loaded via `next/font/google` for performance. Gold replaced brandy as the primary accent colour for better visibility on dark surfaces.

3. **Colour palette audit and accessibility fixes.** A formal audit found two WCAG AA failures in light mode (mushroom-on-parchment secondary text at 2.96:1, brandy-on-parchment accent text at 4.14:1) and flagged several non-critical issues: the surface-alt green-to-purple shift between modes was perceptually jarring, danger colour was unchanged between modes risking low contrast as text, and the semantic token system was incomplete (missing success, warning, info, and disabled tokens). Tonal scales (5-step, 100-500) were documented for all 12 base colours to enable future fine-tuning. A data visualisation palette of 8 colours was proposed for charts and colour-coded UI elements like initiative tracker groups.

**What this taught us:** The product needs a design system that is internally consistent and accessible from the start, not layered on after the fact. Building two modes (light/dark) before the base palette was validated was premature. The audit discipline — checking every text/background pairing against WCAG thresholds — should happen at palette selection time, not as a retrofit.

### Session Timeline: The Hardest Layout Problem

The session page went through two major architectural iterations, and the evolution reveals the core tension in the product: the GM needs to see everything at once during play, but screen space is finite.

**Iteration 1: Three-panel layout (Workshop | Timeline | Inventory).** The original design split the session page into three simultaneous panels. The Workshop (left) held seven tabs for creating and editing content. The Timeline (centre) was a vertical feed of assembled session content — scenes, battles, NPCs, monsters, spells, and PCs as drag-and-drop reorderable blocks. The Inventory (right) listed all campaign and session entities with "+" buttons to add them to the timeline. The idea was that the GM would author content in the Workshop, assemble it in the Timeline, and pull from the Inventory during play — all without leaving the page.

**Iteration 2: Full-width simplification.** The three-panel layout made the timeline too narrow for comfortable reading. The Workshop panel duplicated functionality — scenes could just be edited directly on the timeline, and other content was better served by full-width tabs. The redesign collapsed to tabs above the content area: the Scenes tab showed the timeline plus an inventory sidebar, while all other tabs took full page width. The Workshop panel was eliminated entirely.

**What this taught us:** The timeline concept — a vertical feed of mixed content blocks that the GM assembles into a session plan and runs during play — is the right organising principle. But cramming multiple panels onto one screen fights against both mobile usability and cognitive load. The key insight is that authoring and running are different modes: during prep, the GM wants full editing tools; during play, the GM wants a clean, scrollable reference with inline controls for the active encounter. v2 should consider whether these modes deserve different views rather than trying to serve both in one layout.

### Scene Editor: Markdown as the Right Level of Abstraction

The scene editor settled on a simple but effective content model: standard markdown with a single TTRPG-specific convention — blockquotes (`> text`) render as "read-aloud" boxes, styled with a gold left border and italic parchment styling. This is a widespread TTRPG convention (text the GM reads aloud to players gets special formatting), and mapping it to markdown's native blockquote syntax was the most natural fit.

The editor used a split edit/preview mode with `react-markdown` for rendering, not a WYSIWYG editor. Auto-save with 2-second debounce, save-on-blur as a safety net, and save-before-scene-switch to prevent data loss. Scenes had a status lifecycle (upcoming, active, done) that the GM could cycle through during play.

**What this taught us:** Markdown is the right abstraction for GM session content. It is fast to write, readable in raw form, and the rendering can be customised for TTRPG conventions without building a custom editor. The read-aloud blockquote convention specifically should carry forward to v2 — it is universally understood by GMs and maps cleanly to a standard syntax.

### Typography and Layout: Formal Specs That Emerged From Ad-Hoc Patterns

v1 started with ad-hoc typography — MedievalSharp for headings at whatever Tailwind size felt right, system sans-serif for body text. Over time, inconsistencies accumulated (H3 card titles were larger than H2 subsection headers, spacing varied between identical components), which prompted formal specifications:

- **Typography system:** A Major Third (1.250) type scale with 8 hierarchy levels (Display through Label), responsive size adjustments at the 640px breakpoint, and a 4px baseline grid for vertical rhythm. Each level specified font family, size, weight, line height, letter spacing, and colour token.
- **Screen layouts:** Complete grid structure definitions for three primary screens (Dashboard, Campaign View, Initiative Tracker), covering column counts per breakpoint, gutters, page margins, component specifications with exact spacing values, and dark/light mode differences per element.
- **Interaction design:** State machines for every major flow (theme toggle, initiative tracker, NPC generator, navigation), micro-interaction specs for button states and card hover effects, animation duration scale (100ms fast, 200ms normal, 300ms slow, 960ms dice roll), easing functions, touch target sizes (minimum 44px for gaming-table use), swipe gestures, long-press actions, and comprehensive loading/error/empty state patterns.

**What this taught us:** These specs were valuable as documentation of intent, but they arrived too late to prevent the inconsistencies they were designed to fix. v2 should establish its design tokens and component patterns before building features, not after. The interaction design spec in particular contains good thinking about gaming-table ergonomics (one-handed phone use, dim lighting, minimum touch targets) that should inform v2's mobile design.

### Icons: RPG-Awesome as the Primary Source

The icon strategy used RPG-Awesome (a CSS icon font with fantasy-themed glyphs like swords, shields, dragons, books, scrolls, and dice) as the primary source, with game-icons.net SVGs as a supplement for anything RPG-Awesome lacked. A thin `RpgIcon` wrapper component handled sizing and accessibility (`aria-hidden="true"` since icons were always paired with text labels). Icons were applied at "medium" coverage — tool buttons, section headers, stat labels, and tabs, but not on every button or form field.

**What this taught us:** Fantasy-flavoured icons add significant atmosphere with minimal implementation cost. The rule of always pairing icons with text (never icon-only) was good for accessibility and should carry forward regardless of which icon library v2 chooses.

### Animation and Particles: Polish Layer

Motion design used the `motion` library (Framer Motion successor) for page transitions (fade + slide-up), staggered card entrance animations, initiative tracker reordering (layout animations), dice roll bounces, and panel open/close via AnimatePresence. Ambient particle effects used `@tsparticles/react` with two variants: candle embers on the login page and floating dust motes on the dashboard. Particles were deliberately restricted to only those two pages — campaign and session pages stayed clean for focused work.

A `prefers-reduced-motion` check disabled all transform-based animations and replaced transitions with instant opacity changes.

**What this taught us:** The tiered approach to animation was sound — ambient effects only on low-interaction pages, functional animations (layout reordering, panel transitions) on working pages, and a global reduced-motion escape hatch. Applying animations piecemeal across many components created maintenance overhead; v2 should decide on an animation strategy early and implement it through shared primitives rather than per-component motion code.

---

## 6. Key Learnings

### Architectural Observations

These are patterns that emerged from building v1 — things a v2 architect should know:

- **SessionDashboard grew to 413 lines** managing all state inline with `useState`. There's no shared state management (no Context, no store, no data layer). Every component that needs data makes its own Supabase calls. This worked for prototyping but would not scale.
- **Polymorphic patterns caused real complexity.** `source_type`/`source_id` on Combatant and `block_type`/`source_id` on TimelineBlock mean that adding a new entity type requires changes in 4+ places. Type safety is weak across these boundaries.
- **The timeline went through two full rewrites** (three-panel → full-width) as the right UX was discovered iteratively. This is the feature with the most unclear architecture.
- **Components are self-contained but large.** InitiativeTracker, PCSheet, SessionDashboard each handle their own data fetching, state, and rendering. Good for isolation, bad for consistency and reuse.
- **No tests anywhere in the project.** Zero unit, integration, or e2e tests.
- **No error boundaries or meaningful error handling.** API failures show as blank screens or console errors.

### User Experience Observations

The project has not been used in a real game session yet. These observations come from building and testing:

- **The navigation flow isn't right.** The current structure scatters tools (NPCs, monsters, spells, generator) as separate pages accessible from the campaign dashboard. The user's vision for v2 is:
  - A **hero/home page** after login showing all campaigns
  - **Campaigns as the container for everything** — characters, builders, locations, generators, maps all live inside a campaign
  - **Sessions pull from campaign-level content** — you add characters, NPCs, monsters, spells, maps etc. to a session from the campaign's library
  - **The session view is a timeline** where imported content is arranged and annotated with script/notes by the GM
  - This is a fundamentally different information architecture from v1, where tools were standalone pages rather than campaign-scoped resources feeding into session timelines

- **Wireframing the interactions is the hardest problem.** Getting the flow right — how content moves from campaign library → session → timeline, how you browse and select things, how the timeline editing works on different screen sizes — is where v1 struggled most. The code was secondary to the UX design challenge.

- **The "builder" concept isn't fleshed out.** v1 has an NPC generator but the broader idea of campaign-level builders (for encounters, locations, loot tables, etc.) that feed into sessions is unexplored.

---

## 7. Open Questions for v2

These are decisions explicitly left open for v2 to have opinions on. Each question includes enough context from v1 to inform the decision.

### State management

v1 used inline `useState` everywhere with no shared state. Every component that needs data makes its own Supabase calls — there is no Context, no store, no data layer. This worked for prototyping but led to duplicated fetch logic, inconsistent loading states, and components that were hard to compose. What is the right state management pattern for v2? Options include React Context for shared state, a lightweight store like Zustand, server state management with React Query / TanStack Query, or leaning into Next.js server components and server actions. The choice should account for real-time data (initiative tracker), frequently changing local state (form inputs, UI toggles), and data that multiple components need simultaneously (the current campaign, the active session).

### Component architecture

v1 components grew large — SessionDashboard reached 413 lines, InitiativeTracker and PCSheet were similarly bloated. Each component handled its own data fetching, state management, event handling, and rendering in a single file. How should concerns be split in v2? What is the right granularity for components? Should data fetching be separated from presentation? Should there be a formal component hierarchy (pages → layouts → features → primitives), or is that over-engineering for a project of this scale?

### Visual direction

v1's dark fantasy / parchment aesthetic went through three iterations (light/dark toggle → single dark theme → accessibility audit) and none of them landed in a place the user was happy with. The medieval parchment look is being explicitly abandoned. What should v2 look like? The user wants something that feels right for a GM tool — atmospheric, immersive, functional during play — but is not the generic "fantasy parchment" that every TTRPG tool defaults to. The design needs to work in dim lighting at a gaming table, on both phone and laptop, and should prioritise readability and speed of interaction over decorative elements.

### Feature prioritisation

What should be built first in v2? The user's vision for the build order is: hero page → campaigns → campaign-level content (characters, NPCs, monsters, spells, maps, generators) → sessions that pull from campaign content → session timeline. Is this the right sequence? Should any feature be promoted or deferred? The initiative tracker was v1's most complete feature and the primary real-time use case — should it be built early to validate the real-time architecture, or later once the content pipeline is established?

### Tech stack

v1 used Next.js (App Router) + Supabase + Tailwind CSS. Is this still the right stack for v2? Considerations: Supabase provides auth, Postgres, real-time subscriptions, and row-level security in one package, which reduced setup complexity significantly. Next.js App Router was used but most of the app is client-rendered — server components and server actions were barely explored. Would something else serve better for real-time multi-device sync, offline capability, or the specific needs of a GM toolkit? If the stack stays the same, should v2 lean harder into Next.js server features?

### Real-time sync

v1 uses Supabase Realtime for the initiative tracker only — the `combatants` table broadcasts INSERT, UPDATE, and DELETE events, enabling multi-device sync within ~50-200ms. Should v2 expand real-time to more features? Candidates include: session timeline (so a co-GM or player can see updates live), player handouts (push content to player devices during play), and campaign-level content (collaborative world-building). What about offline support? A GM running a session with spotty wifi needs the app to keep working. Is Supabase Realtime sufficient, or does v2 need a different approach to sync and offline?

### Testing strategy

v1 had zero tests — no unit tests, no integration tests, no e2e tests. This made refactoring risky and bugs hard to catch. What is the right testing approach for v2? The app has a mix of pure logic (D&D mechanics helpers, modifier calculations), data-fetching components (Supabase CRUD), interactive UI (drag-and-drop timeline, initiative tracker), and real-time features. Should v2 use unit tests for helpers, component tests for UI, integration tests for data flows, e2e tests for critical paths, or some combination? What tooling — Vitest, Testing Library, Playwright, Cypress?

### Mobile strategy

v1 was responsive (Tailwind breakpoints) but not mobile-first. The initiative tracker and player views are the primary mobile use cases — a GM checking HP on their phone at the table, or a player viewing the initiative order on their device. Should v2 be designed mobile-first? Should it be a PWA with offline support and home-screen installation? Is there value in a native wrapper (Capacitor, Expo) for push notifications or better offline behaviour? The gaming-table ergonomics matter: one-handed phone use, dim lighting, minimum 44px touch targets, and fast interactions that do not interrupt the flow of play.

### Information architecture

The user wants campaigns to be the container for everything, with sessions pulling content into timelines. The intended hierarchy is: Home (all campaigns) → Campaign (characters, NPCs, monsters, spells, maps, generators, sessions) → Session (timeline assembled from campaign content). How should this hierarchy be structured in the UI? What is the right navigation pattern — sidebar, tabs, breadcrumbs, or something else? How does the GM move between campaign-level content management (prep mode) and session-level timeline running (play mode)? v1 scattered tools as separate pages; v2 needs everything scoped to a campaign with a clear path into sessions.

---

## 8. Explicit Non-Goals

These are things from v1 that should NOT carry forward to v2. This is not a list of failures — some of these were fine for v1's purpose — but v2 is a clean-slate rebuild and should not be constrained by v1's choices.

### The v1 visual design

The colour palette (dark leather backgrounds, gold accents, parchment card surfaces), the typography (Cinzel headings, Crimson Text body), and the component styling (vignette overlays, texture layers, medieval decorative elements) are all being abandoned. v2 should develop its own visual identity from scratch. The accessibility audit findings (WCAG failures, incomplete token system) are worth reading as lessons, but the specific colours and fonts are not carrying forward.

### Specific component implementations

v2 should replicate v1's *behaviour* where it was good (initiative tracker real-time sync, scene editor markdown with read-aloud blockquotes, timeline drag-and-drop reordering) but should not port or reference v1's code. The implementations were tightly coupled to v1's patterns and grew unwieldy. Rebuild from the behavioural descriptions in this document, not from v1 source files.

### The current file and folder structure

v1's project structure (`src/app/`, `src/components/`, `src/lib/`, `src/types/`) was a default Next.js layout that was never reorganised as the project grew. v2 should choose a structure that fits its own architecture — whether that is feature-based, domain-based, or something else entirely.

### Temporary solutions and workarounds

v1 accumulated shortcuts: inline styles where Tailwind classes should have been used, duplicated fetch logic across components, missing error handling, no loading skeletons, and UI states that were hacked together rather than designed. None of these should be preserved or worked around — they should simply not exist in v2.

### The v1 design system specs

v1 produced detailed specifications for typography scales, screen layouts, interaction state machines, and animation timing. These documents captured good thinking about gaming-table ergonomics and accessibility, and the *principles* are worth reading (minimum touch targets, reduced-motion support, tiered animation strategy). But the specific values, token names, and component specs are tied to v1's visual direction and should not constrain v2's design decisions.

---

## Appendix A: Full Type Definitions

These are the TypeScript type definitions from v1. They represent the domain model and can be used as a starting point for v2's data layer.

```typescript
// ============================================
// Ability Scores & Skills
// ============================================

export type AbilityName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export type SkillName =
  | "Acrobatics"
  | "Animal Handling"
  | "Arcana"
  | "Athletics"
  | "Deception"
  | "History"
  | "Insight"
  | "Intimidation"
  | "Investigation"
  | "Medicine"
  | "Nature"
  | "Perception"
  | "Performance"
  | "Persuasion"
  | "Religion"
  | "Sleight of Hand"
  | "Stealth"
  | "Survival";

// ============================================
// Campaign
// ============================================

export type Campaign = {
  id: string;
  gm_id: string;
  name: string;
  description: string | null;
  game_system: string;
  created_at: string;
  updated_at: string;
};

// ============================================
// Session
// ============================================

export type Session = {
  id: string;
  campaign_id: string;
  name: string;
  session_number: number | null;
  scheduled_at: string | null;
  status: "upcoming" | "in_progress" | "completed";
  notes: string | null;
  spotify_playlist_url: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// Player Character
// ============================================

export type PlayerCharacter = {
  id: string;
  campaign_id: string;

  // Identity
  name: string;
  race: string | null;
  class: string | null;
  subclass: string | null;
  level: number;
  background: string | null;
  alignment: string | null;

  // Ability scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Proficiencies
  saving_throw_proficiencies: string[];
  skill_proficiencies: string[];
  skill_expertises: string[];

  // Combat
  hp_current: number;
  hp_max: number;
  hp_temp: number;
  armor_class: number;
  speed: number;
  initiative_bonus: number;
  proficiency_bonus: number;
  hit_dice_total: string | null;
  hit_dice_remaining: number | null;

  // Spellcasting
  spellcasting_ability: string | null;
  spell_slots: Record<string, number> | null;
  spell_slots_used: Record<string, number> | null;
  prepared_spells: string[];

  // Equipment & features
  equipment: EquipmentItem[];
  class_features: Feature[];
  traits: Feature[];

  // Roleplay
  personality_traits: string | null;
  ideals: string | null;
  bonds: string | null;
  flaws: string | null;
  backstory: string | null;
  appearance: string | null;
  notes: string | null;

  // Player contact info
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
  player_whatsapp: string | null;
  player_discord: string | null;

  created_at: string;
  updated_at: string;
};

export type EquipmentItem = {
  name: string;
  quantity?: number;
  description?: string;
};

export type Feature = {
  name: string;
  description: string;
};

// ============================================
// NPC
// ============================================

export type NPC = {
  id: string;
  campaign_id: string | null;
  name: string;
  race: string | null;
  occupation: string | null;
  personality: string | null;
  appearance: string | null;
  stats: NPCStats;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NPCStats = {
  hp?: number;
  ac?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
};

// ============================================
// Monster
// ============================================

export type Monster = {
  id: string;
  campaign_id: string;
  source: "srd" | "homebrew";
  srd_slug: string | null;
  name: string;
  size: string | null;
  type: string | null;
  alignment: string | null;
  challenge_rating: string | null;
  armor_class: number;
  armor_desc: string | null;
  hit_points: number;
  hit_dice: string | null;
  speed: Record<string, number>;
  stat_block: Open5eMonster | Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Open5e API response shape (key fields)
export type Open5eMonster = {
  slug: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: number;
  armor_desc: string;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, number>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  challenge_rating: string;
  actions: MonsterAction[];
  special_abilities: MonsterAction[];
  reactions: string;
  legendary_actions: MonsterAction[];
  legendary_desc: string;
  senses: string;
  languages: string;
  skills: Record<string, number>;
  damage_vulnerabilities: string;
  damage_resistances: string;
  damage_immunities: string;
  condition_immunities: string;
  saving_throws: Record<string, number>;
};

export type MonsterAction = {
  name: string;
  desc: string;
  attack_bonus?: number;
  damage_dice?: string;
  damage_bonus?: number;
};

// ============================================
// Spell
// ============================================

export type Open5eSpell = {
  slug: string;
  name: string;
  desc: string;
  higher_level: string;
  level_int: number;
  level: string;
  school: string;
  dnd_class: string;
  casting_time: string;
  range: string;
  duration: string;
  concentration: string;
  ritual: string;
  requires_verbal_components: boolean;
  requires_somatic_components: boolean;
  requires_material_components: boolean;
  material: string;
  document__slug: string;
  document__title: string;
};

export type Spell = {
  id: string;
  campaign_id: string;
  source: "srd" | "homebrew";
  srd_slug: string | null;
  name: string;
  level: number;
  school: string | null;
  casting_time: string | null;
  range: string | null;
  duration: string | null;
  concentration: boolean;
  ritual: boolean;
  components: string | null;
  classes: string[];
  spell_data: Open5eSpell | Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CharacterSpell = {
  id: string;
  spell_id: string;
  character_id: string;
  character_type: "pc" | "npc";
  is_prepared: boolean;
  created_at: string;
  spell?: Spell;
};

// ============================================
// Combatant (Initiative Tracker)
// ============================================

export type Combatant = {
  id: string;
  campaign_id: string;
  name: string;
  initiative: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  is_player: boolean;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  conditions: string[];
  source_type: "pc" | "npc" | "monster" | null;
  source_id: string | null;
  session_id: string | null;
};

// ============================================
// Battle (Saved Initiative Encounters)
// ============================================

export type CombatantSnapshot = {
  name: string;
  initiative: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  is_player: boolean;
  conditions: string[];
  source_type: "pc" | "npc" | "monster" | null;
  source_id: string | null;
};

export type Battle = {
  id: string;
  session_id: string;
  campaign_id: string;
  name: string;
  type: "template" | "save_state";
  round: number;
  active_index: number;
  in_combat: boolean;
  combatant_data: CombatantSnapshot[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// Scene (Session Editor)
// ============================================

export type Scene = {
  id: string;
  session_id: string;
  campaign_id: string;
  name: string;
  content: string;
  sort_order: number;
  status: 'upcoming' | 'active' | 'done';
  created_at: string;
  updated_at: string;
};

// ============================================
// Timeline Block
// ============================================

export type TimelineBlockType = 'scene' | 'battle' | 'npc' | 'monster' | 'spell' | 'pc';

export type TimelineBlock = {
  id: string;
  session_id: string;
  campaign_id: string;
  block_type: TimelineBlockType;
  source_id: string;
  sort_order: number;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
};
```

---

## Appendix B: Database Schema

These are the Supabase migration files from v1, showing the PostgreSQL schema and Row Level Security policies.

**Note:** The `campaigns` and `combatants` base tables were created via the Supabase dashboard or SQL editor before the migration workflow was established. The `npcs` table was also created outside the migration files. The migrations below capture all subsequent schema changes.

### Player Characters

```sql
create table player_characters (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,

  -- Identity
  name text not null,
  race text,
  class text,
  subclass text,
  level integer default 1,
  background text,
  alignment text,

  -- Ability Scores
  strength integer default 10,
  dexterity integer default 10,
  constitution integer default 10,
  intelligence integer default 10,
  wisdom integer default 10,
  charisma integer default 10,

  -- Proficiencies
  saving_throw_proficiencies text[] default '{}',
  skill_proficiencies text[] default '{}',
  skill_expertises text[] default '{}',

  -- Combat
  hp_current integer default 10,
  hp_max integer default 10,
  hp_temp integer default 0,
  armor_class integer default 10,
  speed integer default 30,
  initiative_bonus integer default 0,
  proficiency_bonus integer default 2,
  hit_dice_total text,
  hit_dice_remaining integer,

  -- Spellcasting
  spellcasting_ability text,
  spell_slots jsonb,
  spell_slots_used jsonb,
  prepared_spells jsonb default '[]',

  -- Equipment & features
  equipment jsonb default '[]',
  class_features jsonb default '[]',
  traits jsonb default '[]',

  -- Roleplay
  personality_traits text,
  ideals text,
  bonds text,
  flaws text,
  backstory text,
  appearance text,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table player_characters enable row level security;

create policy "GMs can manage PCs in their campaigns"
  on player_characters for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
```

### Monsters

```sql
create table monsters (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,

  source text default 'homebrew',
  srd_slug text,

  name text not null,
  size text,
  type text,
  alignment text,
  challenge_rating text,

  armor_class integer default 10,
  armor_desc text,
  hit_points integer default 1,
  hit_dice text,
  speed jsonb default '{"walk": 30}',

  stat_block jsonb default '{}',

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table monsters enable row level security;

create policy "GMs can manage monsters in their campaigns"
  on monsters for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
```

### Combatant Alterations

```sql
-- Add conditions tracking
alter table combatants add column if not exists conditions text[] default '{}';

-- Add source linking (polymorphic reference to PCs, NPCs, monsters)
alter table combatants add column if not exists source_type text;
alter table combatants add column if not exists source_id uuid;
```

### Spells and Character-Spell Junction

```sql
-- Campaign spell library
create table spells (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  source text not null default 'srd',
  srd_slug text,
  name text not null,
  level integer not null default 0,
  school text,
  casting_time text,
  range text,
  duration text,
  concentration boolean default false,
  ritual boolean default false,
  components text,
  classes text[] default '{}',
  spell_data jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Junction table: link spells to PCs and NPCs
create table character_spells (
  id uuid primary key default gen_random_uuid(),
  spell_id uuid references spells(id) on delete cascade not null,
  character_id uuid not null,
  character_type text not null check (character_type in ('pc', 'npc')),
  is_prepared boolean default true,
  created_at timestamptz default now()
);

-- RLS policies
alter table spells enable row level security;
create policy "GMs manage their campaign spells" on spells
  for all using (
    campaign_id in (select id from campaigns where gm_id = auth.uid())
  );

alter table character_spells enable row level security;
create policy "GMs manage character spells" on character_spells
  for all using (
    spell_id in (
      select s.id from spells s
      join campaigns c on s.campaign_id = c.id
      where c.gm_id = auth.uid()
    )
  );
```

### Sessions and Player Contact Fields

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  session_number integer,
  scheduled_at timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed')),
  notes text,
  spotify_playlist_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table sessions enable row level security;
create policy "GMs manage their campaign sessions" on sessions
  for all using (
    campaign_id in (select id from campaigns where gm_id = auth.uid())
  );

-- Player contact fields on player_characters
alter table player_characters
  add column player_name text,
  add column player_email text,
  add column player_phone text,
  add column player_whatsapp text,
  add column player_discord text;

-- Session scoping for combatants
alter table combatants
  add column session_id uuid references sessions(id) on delete set null;
```

### Battles

```sql
create table battles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  name text not null,
  type text not null default 'template' check (type in ('template', 'save_state')),
  round integer default 0,
  active_index integer default 0,
  in_combat boolean default false,
  combatant_data jsonb not null default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table battles enable row level security;
create policy "GMs manage their campaign battles" on battles
  for all using (
    campaign_id in (select id from campaigns where gm_id = auth.uid())
  );
```

### Session Spells

```sql
create table session_spells (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  spell_id uuid references spells(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(session_id, spell_id)
);

alter table session_spells enable row level security;
create policy "GMs manage their session spells" on session_spells
  for all using (
    session_id in (
      select s.id from sessions s
      join campaigns c on s.campaign_id = c.id
      where c.gm_id = auth.uid()
    )
  );
```

### Scenes

```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Scene',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenes_session_sort ON scenes(session_id, sort_order);

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GMs can manage their campaign scenes"
  ON scenes FOR ALL
  USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
```

### Timeline Blocks

```sql
CREATE TABLE timeline_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('scene', 'battle', 'npc', 'monster', 'spell', 'pc')),
  source_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_blocks_session_sort ON timeline_blocks(session_id, sort_order);

ALTER TABLE timeline_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GMs can manage their campaign timeline blocks"
  ON timeline_blocks FOR ALL
  USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
```

---

## Appendix C: Git History Summary

This is the full development history of v1, showing the trajectory of feature development.

```
64798d8 docs: add open questions and non-goals to v2 briefing
ce8d94a docs: add key learnings to v2 briefing
9fd889d docs: add design evolution to v2 briefing
fb7f97b docs: add tech stack and API patterns to v2 briefing
3c4e9dd docs: add data model and schema to v2 briefing
26bece8 docs: add feature inventory to v2 briefing
19e2da1 docs: start v2 briefing — product vision section
1a88f8b docs: add v2 briefing document implementation plan
ff99c0f docs: address spec review feedback on v2 briefing strategy
5becc19 docs: add v2 briefing strategy design spec
f976719 feat: simplify to full-width timeline with tabs above
ab5f23d docs: add timeline v2 spec — full-width simplification
783d91a chore: remove SceneEditor, SceneList, ReferencePanel (replaced by timeline layout)
bb495d1 fix: correct NPC border to purple, PC border to silver per spec
be0ae80 feat: rewrite SessionDashboard as three-panel timeline layout
cfdf820 feat: add TimelinePanel with drag-and-drop reordering and source data resolution
755b705 feat: add TimelineBlock wrapper with collapse/expand and type-specific rendering
2905908 feat: expand SessionTabs to 7 tabs (add Party, NPCs, Battles)
3513a72 feat: add TimelineSceneBlock with edit/save/preview modes
ff387d1 feat: add InventoryPanel sidebar with collapsible sections and add-to-timeline buttons
edb6a2d feat: add MobileDrawer component for mobile slide-out panels
d6f9591 feat: add TimelineBlock type definitions
b911955 feat: add timeline_blocks migration
2f62471 docs: add session timeline implementation plan
34c68ca docs: add implementation notes to session timeline spec
f75196a docs: add session timeline design spec
e7dd900 feat: add SceneEditor and wire into session dashboard
3dfbe04 feat: add SceneContent component with markdown editing and preview
080965d feat: add ReferencePanel with Party/NPC/battle sidebar
5dfa4cc feat: add SceneList component with drag-and-drop reordering
62c81d1 feat: add MarkdownPreview component with read-aloud blockquote styling
a698902 feat: add scenes table, Scene type, and read-aloud CSS
829c41e Add scene editor implementation plan (6 tasks)
0a91b23 fix: update scene editor spec from review feedback
7d8d80d Add scene editor design spec
aa91aff fix: bump particle z-index above vignette, remove CSS hover conflict
e132fcf feat: add staggered card entrances, panel animations, and dice bounce
667ee41 feat: add initiative layout animation and tool button hover effects
d942ec4 feat: add page transitions and particle effects to all pages
f3c0250 feat: add PageTransition, StaggeredList, and ParticleBackground components
0ef2a0e feat: install motion and tsparticles dependencies
001f3ea Add animations + particles design spec
2ec36f0 feat: add RPG icons to initiative tracker, session tabs, and notes panel
4d689f2 feat: add RPG icons to campaign tool buttons, headers, stats, and tabs
9766ee3 feat: add RPG icons to spell list header and character sheet stats
d83b1ab feat: add RPG icons to NPC and monster components
0077498 feat: add RpgIcon wrapper component
2c6f11b feat: install rpg-awesome icon font
23a3afc Add RPG icons implementation plan (6 tasks)
34c953c fix: update RPG icons spec — correct class names, colour rules, sizes
2160e94 Add RPG icons design spec (RPG-Awesome + game-icons.net)
fdf9969 fix: resolve text readability across all components for dark theme
2d8c073 feat: complete dark fantasy theme — initiative tracker and final cleanup
041a172 feat: update spell, character, and session components for leather tome theme
672096a feat: update NPC and monster components for leather tome theme
d1cba26 feat: update campaign components for leather tome theme
a4129ba feat: apply leather tome theme to all pages
d161311 feat: add tome-bg, tome-page, gold-foil CSS classes for leather tome theme
af0cdc8 feat: remove dark mode toggle, consolidate to single dark fantasy tokens
fac2c0b feat: replace MedievalSharp with Cinzel + Crimson Text via next/font
bf09246 Add dark fantasy theme implementation plan (8 tasks)
5a91a27 Add dark fantasy theme design spec (Leather Tome approach)
eb7e200 Add NPC generator with d20 rolling, archetype tables, and gender-neutral quirks
b70f0bb Add character management system with PCs, NPCs, monsters, and quick-add
7771188 Add conditions tracking to initiative tracker and set up Supabase CLI
5012237 Add project foundation: auth, campaign dashboard, and initiative tracker
47db588 Initial commit from Create Next App
```
