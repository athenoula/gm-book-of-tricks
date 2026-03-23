# Tutorial Setup Chapter — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Depends on:** `2026-03-23-guided-tutorial-design.md` (base tutorial system, already implemented)

---

## Overview

Add a new "Getting Started" chapter (Chapter 0) to the guided tutorial that prompts users to create a campaign, character, and session before the main tour begins. This ensures the existing 4 chapters always have real content to highlight.

**Key decisions:**
- Front-loaded setup: create all needed content before the tour starts
- Pre-fill dialogs with suggested values (user can edit before saving)
- If content already exists, show acknowledgment ("We'll use **{name}**") and auto-advance
- Existing chapters renumber from 0-3 to 1-4

---

## Step Definitions for Chapter 0: "Getting Started"

### Step 1: Create Campaign

- **Target:** `[data-tutorial="create-campaign"]` (the "+ New Campaign" button on HomePage)
- **Route:** `/home`
- **Type:** `create`
- **existsCheck:** Query Supabase `campaigns` table for current user's campaigns. If any exist, return `{ exists: true, name: firstCampaign.name }`
- **Prefill:** `{ name: 'My First Campaign', description: 'A practice campaign to learn the tools.' }`
- **Acknowledgment:** "You already have a campaign! We'll use **{name}** for this tour."
- **After creation/acknowledgment:** Store the campaign ID in `tutorialCampaignId` and navigate into the campaign

### Step 2: Create Character

- **Target:** `[data-tutorial="create-character"]` (the "Add PC" / "New Character" button on CharactersPage)
- **Route:** `/campaign/$campaignId/characters`
- **Type:** `create`
- **existsCheck:** Query `player_characters` for campaign. If any exist, return `{ exists: true, name: firstPC.name }`
- **Prefill:** `{ name: 'Aldric', class: 'Fighter', level: 1 }`
- **Acknowledgment:** "You've already got characters — great! Let's keep going."

### Step 3: Create Session

- **Target:** `[data-tutorial="create-session"]` (the "New Session" button on SessionsPage)
- **Route:** `/campaign/$campaignId/sessions`
- **Type:** `create`
- **existsCheck:** Query `sessions` for campaign. If any exist, return `{ exists: true, name: firstSession.name }`
- **Prefill:** `{ name: 'Session 1' }`
- **Acknowledgment:** "You already have sessions set up. Let's continue."

---

## Step Type Extension

Steps gain new optional fields:

```ts
interface TutorialStep {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  route?: string
  type?: 'highlight' | 'create'           // default: 'highlight'
  createEntity?: 'campaign' | 'session' | 'character'
  prefill?: Record<string, unknown>
  existsCheck?: () => Promise<{ exists: boolean; name?: string }>
  acknowledgment?: string                  // template with {name} placeholder
}
```

- `'highlight'` — existing behavior (all current steps)
- `'create'` — runs `existsCheck` first, then either shows acknowledgment or prompts creation
- `acknowledgment` — text shown when entity already exists, `{name}` replaced with the entity's name

### Title and content values for Chapter 0 steps:

| Step | Title | Content (shown when entity doesn't exist) | Acknowledgment |
|------|-------|-------------------------------------------|----------------|
| 1 | Create a Campaign | Let's create your first campaign to get started. Click the button to begin! | You already have a campaign! We'll use **{name}** for this tour. |
| 2 | Add a Character | Every adventure needs heroes. Let's add your first player character. | You've already got characters — great! Let's keep going. |
| 3 | Create a Session | Sessions are where you prep and run your games. Let's create your first one. | You already have sessions set up. Let's continue. |

---

## Overlay Behavior for Create Steps

### When entity does NOT exist (creation mode):
- Spotlight the create button (target element)
- Tooltip text: step's `content` field (e.g., "Let's create your first campaign to get started.")
- No Back/Next buttons — clicking the highlighted button is the "next action"
- The spotlight element gets `pointer-events: auto` (unlike highlight steps) so the user can click through to the actual button
- "Skip tour" link still available
- **Detection strategy:** Don't try to detect dialog open/close via DOM. Instead, simply subscribe to the TanStack Query cache for the relevant query key. When the cache updates with new data, the entity was created → clear `prefillData`, store entity info, advance step. The overlay stays visible but non-blocking during the creation flow — the dialog renders at z-50 which is below the tutorial at z-65, so **temporarily lower the overlay z-index to z-[45]** while in create mode so dialogs/forms render above it.
- **Character creation note:** CharactersPage uses an inline form (not a dialog), so the same z-index lowering approach works — the form renders in the normal page flow above the lowered overlay.
- If the user dismisses/cancels and no entity is created, the overlay remains at the same step.

### When entity exists (acknowledgment mode):
- No spotlight (nothing to highlight)
- Centered tooltip with acknowledgment text including the entity's name in bold (replace `{name}` in the `acknowledgment` template)
- Single "Continue" button (not Back/Next/Skip)
- On click, advance to next step

---

## Pre-filling Dialogs

The tutorial store gains a `prefillData` field. When a `'create'` step activates and the entity doesn't exist, the provider sets `prefillData` in the store with the step's `prefill` values.

**Modified dialog components:**
- `CreateCampaignDialog` — reads `useTutorial().prefillData` to set initial `name` and `description` when tutorial is active and `prefillData` is not null
- `CreateSessionDialog` — reads `prefillData` to set initial `name`
- PC creation form (in `CharactersPage`) — reads `prefillData` to set initial `name`, `class`, `level`

After the dialog closes (success or cancel), `prefillData` is cleared.

The pre-fill is a suggestion, not a constraint. Users can edit all fields before saving.

---

## Store Changes (`src/lib/tutorial.ts`)

Add to `TutorialState`:

```ts
prefillData: Record<string, unknown> | null
tutorialCampaignId: string | null
stepMode: 'highlight' | 'create' | 'acknowledge' | null

setPrefillData: (data: Record<string, unknown> | null) => void
setTutorialCampaignId: (id: string | null) => void
setStepMode: (mode: 'highlight' | 'create' | 'acknowledge' | null) => void
```

- `prefillData` — set when a create step activates, read by dialog components, cleared on dialog close
- `tutorialCampaignId` — set when the Create Campaign step completes (either by creation or acknowledgment of existing), used by route resolution in subsequent steps so `$campaignId` can be resolved even if the URL hasn't been updated yet
- `stepMode` — tracks the current step's rendering mode. Set by the provider after running `existsCheck`. The overlay reads this to decide which UI to show. Reset to `null` between steps.
- `acknowledgeName` — optional string stored alongside `stepMode: 'acknowledge'` for the entity name to display. Add `acknowledgeName: string | null` and `setAcknowledgeName: (name: string | null) => void`

---

## Provider Changes (`src/features/tutorial/TutorialProvider.tsx`)

### Create step flow:

1. Step activates → check `step.type === 'create'`
2. Run `step.existsCheck()` asynchronously
3. If `existsCheck` throws (network error, auth issue): log a warning and skip the step (treat as if entity exists — don't block the tour on infrastructure failures)
4. If exists:
   - Set `stepMode` to `'acknowledge'` and `acknowledgeName` to the entity name
   - For campaigns: also set `tutorialCampaignId` to the campaign's ID
   - For sessions: also store the session ID for later `$sessionId` resolution
5. If not exists:
   - Set `stepMode` to `'create'`
   - Set `prefillData` in store with step's `prefill` values
   - Subscribe to TanStack Query cache for the relevant query key:
     - Campaigns: `['campaigns']`
     - Characters: `['pcs', campaignId]`
     - Sessions: `['sessions', campaignId]`
   - When cache updates with new data → entity was created → clear prefillData, store entity info (campaign ID, session ID), call `advanceStep(chapter.steps.length)` to advance

### Navigation after creation:

- The **provider** handles navigation, not the dialog's `onSuccess` handler
- After the Create Campaign step completes (entity created or acknowledged), the provider navigates into the campaign before advancing to Step 2
- The provider uses `tutorialCampaignId` for route resolution in all subsequent steps

### Route resolution improvement:

- When resolving `$campaignId`, prefer `tutorialCampaignId` from the store over `extractCampaignId()` from the URL hash. Fall back to URL hash if store value is null.

### localStorage migration:

- Change the storage key from `gm-bot-tutorial-completed` to `gm-bot-tutorial-completed-v2` when introducing Chapter 0. This invalidates old completion data, which is acceptable since the chapter structure has changed. Old key is simply ignored.

---

## Data-tutorial Attributes to Add

- `data-tutorial="create-campaign"` on the "+ New Campaign" button in `HomePage.tsx`
- `data-tutorial="create-character"` on the "Add PC" button in `CharactersPage.tsx`
- `data-tutorial="create-session"` on the "New Session" button in `SessionsPage.tsx`

---

## File Changes Summary

**Modified files:**
- `src/lib/tutorial.ts` — Add `prefillData`, `tutorialCampaignId`, and their actions
- `src/features/tutorial/steps.ts` — Add Chapter 0 with 3 create steps, update types
- `src/features/tutorial/TutorialOverlay.tsx` — Handle `create` and `acknowledge` step modes
- `src/features/tutorial/TutorialProvider.tsx` — existsCheck flow, query cache subscription, dialog detection, campaign ID tracking
- `src/features/tutorial/ChapterPicker.tsx` — No changes needed (auto-picks up new chapter from `chapters` array)
- `src/features/campaigns/HomePage.tsx` — Add `data-tutorial="create-campaign"` attribute
- `src/features/campaigns/CreateCampaignDialog.tsx` — Read `prefillData` for pre-fill
- `src/features/sessions/SessionsPage.tsx` — Add `data-tutorial="create-session"` attribute
- `src/features/sessions/CreateSessionDialog.tsx` — Read `prefillData` for pre-fill
- `src/features/characters/CharactersPage.tsx` — Add `data-tutorial="create-character"` attribute, read `prefillData` for PC creation form

---

## Notes

- **Base spec update:** The base tutorial spec says "Watch-only (highlights and explains, user doesn't create anything during the tour)." Chapter 0 changes this contract for its 3 setup steps only. All other chapters remain watch-only. The base spec should be annotated to reflect this evolution.
- **localStorage migration:** Old `gm-bot-tutorial-completed` key is abandoned in favor of `gm-bot-tutorial-completed-v2` to avoid misinterpreting chapter indices from the old numbering scheme.
