# Session Recap & Thread Tracker

## Overview

Two additions to the GM toolkit:
1. **Session recap** — a rich text field on each completed session for writing up what actually happened
2. **Thread tracker** — a campaign-level list of open/resolved plot hooks, clues, promises, and loose threads

Both are manual (no AI). The recap uses the existing SceneEditor (Tiptap). The thread tracker is a simple CRUD list.

This is enhancement #3 of three planned improvements, following the rich text editor and quick reference lookup.

## Goals

- Easy post-session recap writing using the rich text editor already built
- Simple thread tracking at the campaign level (title, status, optional note)
- Resolved threads move to a collapsible section, out of the way but not deleted
- Minimal data model additions — one new column, one new table

## Non-Goals

- AI-generated recaps or thread suggestions
- Session-level thread linking (which session introduced/resolved a thread)
- Thread types or categories (plot hook, clue, rumor, quest, etc.)
- Player-visible recaps or threads

## Data Model

### Sessions table change

Add one column:

| Column | Type | Description |
|--------|------|-------------|
| recap | text | Tiptap JSON content (nullable, default null) |

The existing `notes` field stays unchanged — it serves a different purpose (quick plain-text notes vs. full formatted recap).

### New table: `plot_threads`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (default gen_random_uuid()) |
| campaign_id | uuid | FK to campaigns |
| title | text | e.g., "Who hired the assassin?" |
| status | text | `open` / `resolved` (default `open`) |
| note | text | Optional context (nullable) |
| sort_order | integer | For manual ordering |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS: `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`

## Session Recap

### Where it appears

On the session page (`SessionPage.tsx`), below the session header/status area and above the timeline. Only visible when session status is `completed`.

### Behavior

- **No recap yet:** Shows a prompt — "Session complete — write a recap?" with a button to start
- **Has recap (read mode):** Shows the recap content rendered by SceneEditor in read-only mode, with an "Edit" button
- **Editing:** SceneEditor in editable mode with Save/Cancel buttons. Explicit save (no auto-save)
- **Not completed:** Recap section is hidden entirely

### Data flow

- New `useUpdateSessionRecap` mutation in `useSessions.ts` that updates the `recap` column
- Content stored as Tiptap JSON string (same format as scene content)
- SceneEditor handles the rendering and editing (reused from enhancement #1)

## Thread Tracker

### Where it appears

On the campaign overview page (`CampaignOverview.tsx`), as a new section after the sessions list.

### UI structure

**Header:** "Plot Threads" with a "+ Add Thread" button

**Open threads** listed first, each showing:
- Checkbox to mark as resolved
- Title (click to edit inline, saves on blur)
- Optional note below title (click to edit inline, saves on blur)
- Delete button (with confirmation)
- Amber left border to match the app's visual language

**Resolved section** below:
- Collapsible, collapsed by default
- Header shows count: "Resolved (N)"
- Same layout as open threads but visually dimmed
- Option to reopen (uncheck the checkbox)

### Adding a thread

- Click "+ Add Thread" → inline form appears at the top
- Title input (required) + optional note textarea
- Enter to save, Escape to cancel
- New threads default to `open` status, appended at the end

### Editing

- Click title to edit inline, saves on blur
- Click note area to edit inline, saves on blur
- No separate edit mode — direct inline editing

### Component architecture

| File | Responsibility |
|------|----------------|
| `app/src/features/threads/PlotThreads.tsx` | Section component — header, thread list, add form, resolved section |
| `app/src/features/threads/useThreads.ts` | CRUD hooks — list, create, update status/title/note, delete |

Mounted in `CampaignOverview.tsx`.

## Dependencies

No new npm packages. Uses existing:
- SceneEditor (Tiptap) for recap editing
- Supabase for data
- TanStack Query for hooks
- Existing design tokens and component patterns

New Supabase migration for `recap` column on sessions and `plot_threads` table.
