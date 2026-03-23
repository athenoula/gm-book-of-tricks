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
}
```

- `'highlight'` — existing behavior (all current steps)
- `'create'` — runs `existsCheck` first, then either shows acknowledgment or prompts creation

---

## Overlay Behavior for Create Steps

### When entity does NOT exist (creation mode):
- Spotlight the create button (target element)
- Tooltip text: step's `content` field (e.g., "Let's create your first campaign to get started.")
- No Back/Next buttons — clicking the highlighted button is the "next action"
- "Skip tour" link still available
- When user clicks the button and the creation dialog opens, **hide the tutorial overlay** to get out of the way
- When the dialog closes, check if the entity was created:
  - Created → set `prefillData` to null, store entity info (campaign ID), advance step
  - Cancelled → re-show the tutorial overlay at the same step

### When entity exists (acknowledgment mode):
- No spotlight (nothing to highlight)
- Centered tooltip with acknowledgment text including the entity's name in bold
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

setPrefillData: (data: Record<string, unknown> | null) => void
setTutorialCampaignId: (id: string | null) => void
```

- `prefillData` — set when a create step activates, read by dialog components, cleared on dialog close
- `tutorialCampaignId` — set when the Create Campaign step completes (either by creation or acknowledgment of existing), used by route resolution in subsequent steps so `$campaignId` can be resolved even if the URL hasn't been updated yet

---

## Provider Changes (`src/features/tutorial/TutorialProvider.tsx`)

### Create step flow:

1. Step activates → check `step.type === 'create'`
2. Run `step.existsCheck()` asynchronously
3. If exists:
   - Set `stepMode` to `'acknowledge'` with entity name
   - For campaigns: also set `tutorialCampaignId`
4. If not exists:
   - Set `stepMode` to `'create'`
   - Set `prefillData` in store with step's `prefill` values
   - Subscribe to TanStack Query cache for the relevant query key:
     - Campaigns: `['campaigns']`
     - Characters: `['characters', campaignId]` or `['pcs', campaignId]`
     - Sessions: `['sessions', campaignId]`
   - When cache updates with new data → entity was created → clear prefillData, store entity info, advance step

### Dialog visibility detection:

- When tutorial is in `'create'` mode, watch for dialog elements appearing in the DOM (poll for dialog/modal selectors or use MutationObserver)
- When a dialog/modal is detected: hide the tutorial overlay (`readyToShow = false`)
- When dialog disappears: check if entity was created, re-show overlay or advance

### Route resolution improvement:

- When resolving `$campaignId`, prefer `tutorialCampaignId` from the store over `extractCampaignId()` from the URL hash. Fall back to URL hash if store value is null.

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
