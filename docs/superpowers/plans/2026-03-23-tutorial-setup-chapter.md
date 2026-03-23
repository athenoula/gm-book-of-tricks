# Tutorial Setup Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Getting Started" chapter to the tutorial that prompts users to create a campaign, character, and session before the main tour, ensuring all subsequent chapters have real content to highlight.

**Architecture:** Extend the existing tutorial system with a new `'create'` step type that runs existence checks against Supabase, shows acknowledgment if content exists, or spotlights the create button and watches TanStack Query cache for entity creation. Dialogs read pre-fill data from the tutorial store.

**Tech Stack:** React 19, Zustand, TanStack Query v5, Supabase, existing tutorial components.

**Spec:** `docs/superpowers/specs/2026-03-23-tutorial-setup-chapter-design.md`

---

## File Structure

```
Modified files:
├── src/lib/tutorial.ts                          # Add prefillData, tutorialCampaignId, stepMode, acknowledgeName
├── src/features/tutorial/steps.ts               # Add Chapter 0, TutorialStep type extension
├── src/features/tutorial/TutorialOverlay.tsx     # Handle create + acknowledge step modes
├── src/features/tutorial/TutorialProvider.tsx    # existsCheck flow, query cache subscription, campaign ID tracking
├── src/features/campaigns/HomePage.tsx           # Add data-tutorial="create-campaign"
├── src/features/campaigns/CreateCampaignDialog.tsx # Read prefillData for pre-fill
├── src/features/characters/CharactersPage.tsx    # Add data-tutorial="create-character", read prefillData
├── src/features/sessions/SessionsPage.tsx        # Add data-tutorial="create-session"
├── src/features/sessions/CreateSessionDialog.tsx # Read prefillData for pre-fill
```

---

### Task 1: Extend Tutorial Store

**Files:**
- Modify: `app/src/lib/tutorial.ts`

- [ ] **Step 1: Add new state fields and actions**

Add to the `TutorialState` interface:
```ts
prefillData: Record<string, unknown> | null
tutorialCampaignId: string | null
tutorialSessionId: string | null
stepMode: 'highlight' | 'create' | 'acknowledge' | null
acknowledgeName: string | null

setPrefillData: (data: Record<string, unknown> | null) => void
setTutorialCampaignId: (id: string | null) => void
setTutorialSessionId: (id: string | null) => void
setStepMode: (mode: 'highlight' | 'create' | 'acknowledge' | null) => void
setAcknowledgeName: (name: string | null) => void
```

Add initial values and simple setter actions to the store:
```ts
prefillData: null,
tutorialCampaignId: null,
tutorialSessionId: null,
stepMode: null,
acknowledgeName: null,

setPrefillData: (data) => set({ prefillData: data }),
setTutorialCampaignId: (id) => set({ tutorialCampaignId: id }),
setTutorialSessionId: (id) => set({ tutorialSessionId: id }),
setStepMode: (mode) => set({ stepMode: mode }),
setAcknowledgeName: (name) => set({ acknowledgeName: name }),
```

Also update the localStorage key from `gm-bot-tutorial-completed` to `gm-bot-tutorial-completed-v2` (both in `STORAGE_KEY_COMPLETED` constant and `loadCompleted` function) to invalidate old chapter completion data after renumbering.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/lib/tutorial.ts && git commit -m "feat(tutorial): extend store with prefill, stepMode, and campaign/session tracking"
```

---

### Task 2: Extend Step Types and Add Chapter 0

**Files:**
- Modify: `app/src/features/tutorial/steps.ts`

- [ ] **Step 1: Extend TutorialStep interface**

Add optional fields to `TutorialStep`:
```ts
export interface TutorialStep {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  route?: string
  type?: 'highlight' | 'create'
  createEntity?: 'campaign' | 'session' | 'character'
  prefill?: Record<string, unknown>
  acknowledgment?: string
}
```

Remove `existsCheck` from the interface — it would create a circular dependency since `steps.ts` would need to import the store and Supabase client. Instead, the provider has a `runExistsCheck(createEntity, userId, campaignId)` function (see Task 4).

- [ ] **Step 2: Add Chapter 0 at the beginning of the chapters array**

No new imports needed — step data is purely serializable. Insert a new chapter at index 0 (before "Navigation"):

```ts
{
  name: 'Getting Started',
  steps: [
    {
      target: '[data-tutorial="create-campaign"]',
      title: 'Create a Campaign',
      content: "Let's create your first campaign to get started. Click the button to begin!",
      placement: 'bottom',
      route: '/home',
      type: 'create' as const,
      createEntity: 'campaign' as const,
      prefill: { name: 'My First Campaign', description: 'A practice campaign to learn the tools.' },
      acknowledgment: "You already have a campaign! We'll use **{name}** for this tour.",
    },
    {
      target: '[data-tutorial="create-character"]',
      title: 'Add a Character',
      content: "Every adventure needs heroes. Let's add your first player character.",
      placement: 'bottom',
      route: '/campaign/$campaignId/characters',
      type: 'create' as const,
      createEntity: 'character' as const,
      prefill: { name: 'Aldric', class: 'Fighter', level: 1 },
      acknowledgment: "You've already got characters — great! Let's keep going.",
    },
    {
      target: '[data-tutorial="create-session"]',
      title: 'Create a Session',
      content: "Sessions are where you prep and run your games. Let's create your first one.",
      placement: 'bottom',
      route: '/campaign/$campaignId/sessions',
      type: 'create' as const,
      createEntity: 'session' as const,
      prefill: { name: 'Session 1' },
      acknowledgment: "You already have sessions set up. Let's continue.",
    },
  ],
},
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/tutorial/steps.ts && git commit -m "feat(tutorial): add Getting Started chapter with create step types"
```

---

### Task 3: Update TutorialOverlay for Create and Acknowledge Modes

**Files:**
- Modify: `app/src/features/tutorial/TutorialOverlay.tsx`

- [ ] **Step 1: Read the current overlay component and the tutorial store**

Read `app/src/features/tutorial/TutorialOverlay.tsx` and `app/src/lib/tutorial.ts` to understand current structure.

- [ ] **Step 2: Add create and acknowledge rendering modes**

Import `useTutorial` from `@/lib/tutorial`.

Read `stepMode` and `acknowledgeName` from the store.

The overlay now renders three different UIs based on `stepMode`:

**`'highlight'` (existing, default):** No changes. Spotlight + tooltip with Back/Next/Skip.

**`'create'`:**
- Same spotlight on target element, but the spotlight gets `pointer-events: auto` so the user can click through to the button
- Entire overlay renders at `z-[45]` instead of `z-[65]` so dialogs (z-50) and inline forms render above it
- Tooltip shows `step.content` text
- No Back/Next buttons — just "Skip tour" link
- Add a small pulsing indicator or arrow pointing at the target to draw attention

**`'acknowledge'`:**
- No spotlight (no target to highlight)
- Tooltip renders centered on screen (fixed, centered horizontally, ~30% from top)
- Shows the `acknowledgment` text from the step with `{name}` replaced by `acknowledgeName`
- Render the name in bold (wrap in `<strong>`)
- Single "Continue" button (primary variant)
- No Back button, no "Skip tour" link (just Continue)

Key implementation detail for the acknowledge tooltip positioning: don't use `getBoundingClientRect` — there's no target. Use fixed positioning:
```tsx
style={{
  position: 'fixed',
  top: '30%',
  left: '50%',
  transform: 'translateX(-50%)',
}}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/tutorial/TutorialOverlay.tsx && git commit -m "feat(tutorial): add create and acknowledge rendering modes to overlay"
```

---

### Task 4: Update TutorialProvider with Create Step Logic

**Files:**
- Modify: `app/src/features/tutorial/TutorialProvider.tsx`

This is the most complex task. Read the file first.

- [ ] **Step 1: Add the `runExistsCheck` function**

Add a function inside the component (or as a module-level helper) that queries Supabase based on `createEntity` type:

```ts
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query'

async function runExistsCheck(
  entity: 'campaign' | 'session' | 'character',
  userId: string | undefined,
  campaignId: string | null,
): Promise<{ exists: boolean; name?: string; id?: string }> {
  try {
    switch (entity) {
      case 'campaign': {
        if (!userId) return { exists: false }
        const { data } = await supabase
          .from('campaigns')
          .select('id, name')
          .eq('gm_id', userId)
          .limit(1)
          .single()
        return data ? { exists: true, name: data.name, id: data.id } : { exists: false }
      }
      case 'character': {
        if (!campaignId) return { exists: false }
        const { data } = await supabase
          .from('player_characters')
          .select('id, name')
          .eq('campaign_id', campaignId)
          .limit(1)
          .single()
        return data ? { exists: true, name: data.name } : { exists: false }
      }
      case 'session': {
        if (!campaignId) return { exists: false }
        const { data } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('campaign_id', campaignId)
          .limit(1)
          .single()
        return data ? { exists: true, name: data.name, id: data.id } : { exists: false }
      }
    }
  } catch {
    console.warn(`[Tutorial] existsCheck failed for ${entity}, skipping step`)
    return { exists: true, name: 'existing' }
  }
}
```

- [ ] **Step 2: Modify the route navigation / polling effect to handle create steps**

In the main effect (section 4 of the current provider), after resolving the route and before starting polling, check if the step is a create step:

```ts
if (step.type === 'create' && step.createEntity) {
  const result = await runExistsCheck(step.createEntity, user?.id, tutorialCampaignId)

  if (cancelled) return

  if (result.exists) {
    // Acknowledge mode
    store.setStepMode('acknowledge')
    store.setAcknowledgeName(result.name || '')

    // Store IDs for later route resolution
    if (step.createEntity === 'campaign' && result.id) {
      store.setTutorialCampaignId(result.id)
    }
    if (step.createEntity === 'session' && result.id) {
      store.setTutorialSessionId(result.id)
    }

    setReadyToShow(true)
    return
  }

  // Create mode — entity doesn't exist
  store.setStepMode('create')
  store.setPrefillData(step.prefill || null)

  // Subscribe to TanStack Query cache for entity creation
  const queryKey = step.createEntity === 'campaign'
    ? ['campaigns']
    : step.createEntity === 'character'
      ? ['pcs', tutorialCampaignId]
      : ['sessions', tutorialCampaignId]

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (cancelled) return
    if (event.query.queryKey[0] === queryKey[0]) {
      // Entity likely created — re-run exists check to confirm and get ID/name
      void runExistsCheck(step.createEntity!, user?.id, store.tutorialCampaignId).then((recheck) => {
        if (cancelled || !recheck.exists) return

        store.setPrefillData(null)
        store.setStepMode(null)

        if (step.createEntity === 'campaign' && recheck.id) {
          store.setTutorialCampaignId(recheck.id)
        }
        if (step.createEntity === 'session' && recheck.id) {
          store.setTutorialSessionId(recheck.id)
        }

        // Advance step
        const ch = chapters[store.currentChapter]
        if (ch) store.advanceStep(ch.steps.length)
      })
    }
  })

  // Start polling for target element to show spotlight
  startPolling()

  // Store unsubscribe for cleanup
  cacheUnsubRef.current = unsubscribe
  return
}

// Existing highlight step logic...
store.setStepMode('highlight')
```

Add a `cacheUnsubRef` ref:
```ts
const cacheUnsubRef = useRef<(() => void) | null>(null)
```

Clean it up in the effect cleanup:
```ts
return () => {
  cancelled = true
  clearPolling()
  cacheUnsubRef.current?.()
  cacheUnsubRef.current = null
}
```

- [ ] **Step 3: Update route resolution to prefer tutorialCampaignId and tutorialSessionId**

In the `resolveRoute` function, change:
```ts
if (route.includes('$campaignId')) {
  const campaignId = useTutorial.getState().tutorialCampaignId || extractCampaignId()
  if (!campaignId) return null
  route = route.replace('$campaignId', campaignId)
}
if (route.includes('$sessionId')) {
  let sessionId = useTutorial.getState().tutorialSessionId || extractSessionId()
  // ... existing Supabase fallback query ...
```

- [ ] **Step 4: Handle acknowledge step advancement**

The overlay's "Continue" button calls `onNext`. In the provider's `handleNext`, check if we're in acknowledge mode and need to navigate into the campaign first:

For the campaign acknowledge step: after advancing, the next step routes to `/campaign/$campaignId/characters`. The provider's route resolution already handles this via `tutorialCampaignId`.

No special handling needed — `handleNext` calls `advanceStep` which moves to the next step, and the next step's route resolution picks up `tutorialCampaignId`.

- [ ] **Step 5: Guard keyboard shortcuts based on stepMode**

In the keyboard handling effect (section 7), wrap the ArrowRight/Enter handler:

```ts
case 'ArrowRight':
case 'Enter': {
  const mode = useTutorial.getState().stepMode
  // In create mode, user must actually create the entity — don't auto-advance
  if (mode === 'create') return
  e.preventDefault()
  handleNext()
  break
}
```

ArrowLeft (back) should also be blocked in create and acknowledge modes:
```ts
case 'ArrowLeft': {
  const mode = useTutorial.getState().stepMode
  if (mode === 'create' || mode === 'acknowledge') return
  e.preventDefault()
  back()
  break
}
```

- [ ] **Step 6: Clear prefillData on step/chapter transitions**

In the main routing/polling effect, at the top (before setting readyToShow to false), clear stale prefill data:

```ts
const store = useTutorial.getState()
store.setPrefillData(null)
store.setStepMode(null)
store.setAcknowledgeName(null)
```

This ensures prefill data doesn't leak across steps or persist after dialog cancel.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 8: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/tutorial/TutorialProvider.tsx && git commit -m "feat(tutorial): add create step logic with existsCheck and query cache subscription"
```

---

### Task 5: Add data-tutorial Attributes to Create Buttons

**Files:**
- Modify: `app/src/features/campaigns/HomePage.tsx`
- Modify: `app/src/features/characters/CharactersPage.tsx`
- Modify: `app/src/features/sessions/SessionsPage.tsx`

- [ ] **Step 1: Read all three files**

Read each file to find the exact create buttons.

- [ ] **Step 2: Add data-tutorial attributes**

In `HomePage.tsx`: Add `data-tutorial="create-campaign"` to the "+ New Campaign" `<Button>` (line ~35):
```tsx
<Button size="md" onClick={() => setShowCreate(true)} data-tutorial="create-campaign">
```

In `CharactersPage.tsx`: Add `data-tutorial="create-character"` to the "+ Add PC" `<Button>` in `PCList` (line ~51):
```tsx
<Button size="sm" onClick={() => setShowForm(!showForm)} data-tutorial="create-character">
```

In `SessionsPage.tsx`: Add `data-tutorial="create-session"` to the "New Session" `<Button>`. Read the file first to find the exact button.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/campaigns/HomePage.tsx app/src/features/characters/CharactersPage.tsx app/src/features/sessions/SessionsPage.tsx && git commit -m "feat(tutorial): add data-tutorial attributes to create buttons"
```

---

### Task 6: Pre-fill Dialogs from Tutorial Store

**Files:**
- Modify: `app/src/features/campaigns/CreateCampaignDialog.tsx`
- Modify: `app/src/features/sessions/CreateSessionDialog.tsx`
- Modify: `app/src/features/characters/CharactersPage.tsx` (PCCreateForm)

- [ ] **Step 1: Read all three files**

Read each dialog/form file to understand the state initialization.

- [ ] **Step 2: Pre-fill CreateCampaignDialog**

In `CreateCampaignDialog.tsx`:
- Import `useTutorial` from `@/lib/tutorial`
- Read prefill data and use it for initial state:

```tsx
const { prefillData, isActive } = useTutorial()

const [name, setName] = useState('')
const [description, setDescription] = useState('')
const [gameSystem, setGameSystem] = useState('dnd5e-2024')

// Pre-fill from tutorial when dialog opens
useEffect(() => {
  if (open && isActive && prefillData) {
    if (prefillData.name) setName(prefillData.name as string)
    if (prefillData.description) setDescription(prefillData.description as string)
  }
}, [open, isActive, prefillData])
```

Import `useEffect` from react.

- [ ] **Step 3: Pre-fill CreateSessionDialog**

In `CreateSessionDialog.tsx`:
- Import `useTutorial` from `@/lib/tutorial` and `useEffect` from react
- Same pattern:

```tsx
const { prefillData, isActive } = useTutorial()

useEffect(() => {
  if (open && isActive && prefillData) {
    if (prefillData.name) setName(prefillData.name as string)
  }
}, [open, isActive, prefillData])
```

- [ ] **Step 4: Pre-fill PCCreateForm**

In `CharactersPage.tsx`, modify the `PCCreateForm` function:
- Import `useTutorial` from `@/lib/tutorial` and `useEffect` from react (useEffect should already be imported)
- Inside `PCCreateForm`, read prefill data:

```tsx
const { prefillData, isActive } = useTutorial()

useEffect(() => {
  if (isActive && prefillData) {
    if (prefillData.name) setName(prefillData.name as string)
    if (prefillData.class) setPcClass(prefillData.class as string)
    if (prefillData.level) setLevel(String(prefillData.level))
  }
}, [isActive, prefillData])
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 6: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/campaigns/CreateCampaignDialog.tsx app/src/features/sessions/CreateSessionDialog.tsx app/src/features/characters/CharactersPage.tsx && git commit -m "feat(tutorial): pre-fill create dialogs from tutorial store"
```

---

### Task 7: Build Check and QA

**Files:**
- Possibly modify any of the above files for fixes

- [ ] **Step 1: Run production build**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx vite build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 2: Run dev server and test**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npm run dev`

Test:
1. Clear localStorage and reload — tutorial auto-starts at "Getting Started"
2. If you have campaigns: Step 1 shows acknowledgment with campaign name, "Continue" button advances
3. If you don't: Step 1 spotlights "New Campaign" button, pre-fills dialog on click
4. After campaign step: navigates into campaign, Step 2 highlights "Add PC" button
5. Character pre-fill: name "Aldric", class "Fighter", level 1
6. Session pre-fill: name "Session 1"
7. After all 3 setup steps: Chapter 1 (Navigation) starts with real content
8. Chapter picker shows 5 chapters now with "Getting Started" at top
9. Replaying Getting Started when content exists shows acknowledgments

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Commit fixes**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add -A && git commit -m "fix(tutorial): polish setup chapter flow and edge cases"
```
