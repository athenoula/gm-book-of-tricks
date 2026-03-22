# Session Recap & Thread Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rich text recap field to completed sessions and a plot thread tracker on the campaign overview page.

**Architecture:** One migration (new column + new table), one type update, one new feature module (threads), and modifications to two existing pages (SessionPage, CampaignOverview). The recap reuses SceneEditor from enhancement #1.

**Tech Stack:** React 19, TanStack Query, Supabase, Tiptap (via SceneEditor), Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-21-recap-threads-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/supabase/migrations/20260321150000_recap_threads.sql` | Create | Add `recap` column to sessions, create `plot_threads` table with RLS |
| `app/src/lib/types.ts` | Modify | Add `recap` field to Session type |
| `app/src/features/sessions/useSessions.ts` | Modify | Add `useUpdateSessionRecap` mutation |
| `app/src/features/sessions/SessionRecap.tsx` | Create | Recap section component (SceneEditor, edit/save/cancel) |
| `app/src/features/sessions/SessionPage.tsx` | Modify | Mount SessionRecap between header and timeline |
| `app/src/features/threads/useThreads.ts` | Create | CRUD hooks for plot_threads |
| `app/src/features/threads/PlotThreads.tsx` | Create | Thread tracker section component |
| `app/src/features/campaigns/CampaignOverview.tsx` | Modify | Mount PlotThreads after sessions section |

---

### Task 1: Database Migration

**Files:**
- Create: `app/supabase/migrations/20260321150000_recap_threads.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add recap field to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recap text DEFAULT NULL;

-- Plot threads table
CREATE TABLE plot_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  note text DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plot_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plot_threads_campaign_access" ON plot_threads
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE INDEX idx_plot_threads_campaign ON plot_threads(campaign_id);

CREATE TRIGGER update_plot_threads_updated_at
  BEFORE UPDATE ON plot_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Push migration**

```bash
cd app && echo "Y" | npx supabase db push
```

- [ ] **Step 3: Update Session type**

In `app/src/lib/types.ts`, add `recap` to the Session type. Find:

```typescript
export type Session = {
  id: string
  campaign_id: string
  name: string
  session_number: number | null
  scheduled_at: string | null
  status: 'upcoming' | 'in_progress' | 'completed'
  notes: string | null
  created_at: string
  updated_at: string
}
```

Add `recap: string | null` after `notes`:

```typescript
export type Session = {
  id: string
  campaign_id: string
  name: string
  session_number: number | null
  scheduled_at: string | null
  status: 'upcoming' | 'in_progress' | 'completed'
  notes: string | null
  recap: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 4: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/supabase/migrations/20260321150000_recap_threads.sql app/src/lib/types.ts
git commit -m "feat: add recap column to sessions and plot_threads table"
```

---

### Task 2: Session Recap Hook & Component

**Files:**
- Modify: `app/src/features/sessions/useSessions.ts`
- Create: `app/src/features/sessions/SessionRecap.tsx`

- [ ] **Step 1: Add recap mutation to useSessions.ts**

Add this function at the end of `app/src/features/sessions/useSessions.ts`:

```typescript
export function useUpdateSessionRecap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, recap }: { id: string; recap: string }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ recap })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.campaign_id] })
      queryClient.invalidateQueries({ queryKey: ['session', data.id] })
      useToastStore.getState().addToast('success', 'Recap saved')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
```

Note: This needs the `Session` type import. Check if it's already imported — it is, from `@/lib/types`.

- [ ] **Step 2: Create SessionRecap component**

Create `app/src/features/sessions/SessionRecap.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SceneEditor } from '@/features/timeline/SceneEditor'
import { useUpdateSessionRecap } from './useSessions'
import type { Session } from '@/lib/types'

interface Props {
  session: Session
}

export function SessionRecap({ session }: Props) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const updateRecap = useUpdateSessionRecap()

  // Only show on completed sessions
  if (session.status !== 'completed') return null

  const hasRecap = !!session.recap

  const handleStartEdit = () => {
    setEditContent(session.recap || '')
    setEditing(true)
  }

  const handleSave = () => {
    updateRecap.mutate(
      { id: session.id, recap: editContent },
      { onSuccess: () => setEditing(false) },
    )
  }

  const handleCancel = () => {
    setEditing(false)
  }

  // No recap yet — show prompt
  if (!hasRecap && !editing) {
    return (
      <div className="mb-6 bg-bg-base rounded-[--radius-lg] border border-border p-6 text-center">
        <p className="text-text-secondary text-sm mb-3">Session complete — write a recap?</p>
        <Button size="sm" onClick={handleStartEdit}>Write Recap</Button>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-bg-base rounded-[--radius-lg] border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-heading">Session Recap</h3>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={updateRecap.isPending}>
                {updateRecap.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleStartEdit}>Edit</Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <SceneEditor
          content={editing ? editContent : session.recap}
          editable={editing}
          onChange={setEditContent}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/sessions/useSessions.ts app/src/features/sessions/SessionRecap.tsx
git commit -m "feat: add session recap component with rich text editor"
```

---

### Task 3: Mount Recap on Session Page

**Files:**
- Modify: `app/src/features/sessions/SessionPage.tsx`

- [ ] **Step 1: Add import**

Add to the imports in `app/src/features/sessions/SessionPage.tsx`:

```typescript
import { SessionRecap } from './SessionRecap'
```

- [ ] **Step 2: Mount SessionRecap between header and initiative tracker**

In `SessionPage.tsx`, find the section after the header closing `</div>` (around line 86) and before the initiative tracker. Add:

```tsx
      {/* Recap (only visible on completed sessions) */}
      <SessionRecap session={session} />
```

Place it right after the closing `</div>` of the session header (the `<div className="mb-6">` block) and before the initiative tracker section.

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/sessions/SessionPage.tsx
git commit -m "feat: mount session recap on session page"
```

---

### Task 4: Thread Tracker Hooks

**Files:**
- Create: `app/src/features/threads/useThreads.ts`

- [ ] **Step 1: Create the directory and hook file**

```bash
mkdir -p "app/src/features/threads"
```

Create `app/src/features/threads/useThreads.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type PlotThread = {
  id: string
  campaign_id: string
  title: string
  status: 'open' | 'resolved'
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export function useThreads(campaignId: string) {
  return useQuery({
    queryKey: ['plot-threads', campaignId],
    queryFn: async (): Promise<PlotThread[]> => {
      const { data, error } = await supabase
        .from('plot_threads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreateThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      title: string
      note?: string
      sort_order?: number
    }) => {
      const { data, error } = await supabase
        .from('plot_threads')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as PlotThread
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plot-threads', data.campaign_id] })
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      title?: string
      status?: PlotThread['status']
      note?: string | null
    }) => {
      const { data, error } = await supabase
        .from('plot_threads')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PlotThread
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plot-threads', data.campaign_id] })
    },
  })
}

export function useDeleteThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from('plot_threads')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plot-threads', data.campaignId] })
      useToastStore.getState().addToast('success', 'Thread deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/threads/useThreads.ts
git commit -m "feat: add plot thread CRUD hooks"
```

---

### Task 5: Thread Tracker Component

**Files:**
- Create: `app/src/features/threads/PlotThreads.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useThreads, useCreateThread, useUpdateThread, useDeleteThread } from './useThreads'
import type { PlotThread } from './useThreads'

interface Props {
  campaignId: string
}

export function PlotThreads({ campaignId }: Props) {
  const { data: threads, isLoading } = useThreads(campaignId)
  const createThread = useCreateThread()
  const updateThread = useUpdateThread()
  const deleteThread = useDeleteThread()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const openThreads = threads?.filter((t) => t.status === 'open') ?? []
  const resolvedThreads = threads?.filter((t) => t.status === 'resolved') ?? []

  const handleAdd = () => {
    if (!newTitle.trim()) return
    const maxSort = threads ? Math.max(0, ...threads.map((t) => t.sort_order)) + 1 : 0
    createThread.mutate({
      campaign_id: campaignId,
      title: newTitle.trim(),
      note: newNote.trim() || undefined,
      sort_order: maxSort,
    })
    setNewTitle('')
    setNewNote('')
    setShowAddForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      setShowAddForm(false)
      setNewTitle('')
      setNewNote('')
    }
  }

  const handleToggleStatus = (thread: PlotThread) => {
    updateThread.mutate({
      id: thread.id,
      status: thread.status === 'open' ? 'resolved' : 'open',
    })
  }

  const handleDelete = (thread: PlotThread) => {
    if (window.confirm(`Delete "${thread.title}"?`)) {
      deleteThread.mutate({ id: thread.id, campaignId })
    }
  }

  if (isLoading) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl">Plot Threads</h3>
        <Button size="sm" onClick={() => {
          setShowAddForm(true)
          requestAnimationFrame(() => titleInputRef.current?.focus())
        }}>
          + Add Thread
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-4 mb-3">
          <input
            ref={titleInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Thread title..."
            className="w-full bg-transparent text-text-heading text-sm font-medium outline-none border-b border-border-hover focus:border-primary pb-1 mb-2"
          />
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Note (optional)..."
            className="w-full bg-transparent text-text-secondary text-xs outline-none resize-none min-h-[40px]"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewTitle(''); setNewNote('') }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Open threads */}
      {openThreads.length === 0 && !showAddForm && (
        <p className="text-text-muted text-sm py-4 text-center">No open plot threads</p>
      )}

      <div className="space-y-2">
        {openThreads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onUpdate={(updates) => updateThread.mutate({ id: thread.id, ...updates })}
          />
        ))}
      </div>

      {/* Resolved section */}
      {resolvedThreads.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1.5 text-text-muted text-xs cursor-pointer hover:text-text-secondary transition-colors"
          >
            <span>{showResolved ? '▾' : '▸'}</span>
            Resolved ({resolvedThreads.length})
          </button>

          {showResolved && (
            <div className="space-y-2 mt-2 opacity-60">
              {resolvedThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  onUpdate={(updates) => updateThread.mutate({ id: thread.id, ...updates })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Thread Item ────────────────────────────────────────

function ThreadItem({
  thread,
  onToggleStatus,
  onDelete,
  onUpdate,
}: {
  thread: PlotThread
  onToggleStatus: (t: PlotThread) => void
  onDelete: (t: PlotThread) => void
  onUpdate: (updates: { title?: string; note?: string | null }) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [titleValue, setTitleValue] = useState(thread.title)
  const [noteValue, setNoteValue] = useState(thread.note || '')

  const handleTitleBlur = () => {
    setEditingTitle(false)
    if (titleValue.trim() && titleValue !== thread.title) {
      onUpdate({ title: titleValue.trim() })
    } else {
      setTitleValue(thread.title)
    }
  }

  const handleNoteBlur = () => {
    setEditingNote(false)
    const newNote = noteValue.trim() || null
    if (newNote !== thread.note) {
      onUpdate({ note: newNote })
    }
  }

  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border border-l-3 border-l-primary px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Checkbox */}
        <button
          onClick={() => onToggleStatus(thread)}
          className={`w-4 h-4 rounded-[3px] border-2 shrink-0 cursor-pointer transition-colors ${
            thread.status === 'resolved'
              ? 'bg-primary border-primary'
              : 'border-primary hover:bg-primary/20'
          }`}
          title={thread.status === 'open' ? 'Mark resolved' : 'Reopen'}
        >
          {thread.status === 'resolved' && (
            <span className="text-[10px] text-text-inverse flex items-center justify-center">✓</span>
          )}
        </button>

        {/* Title */}
        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setTitleValue(thread.title); setEditingTitle(false) } }}
            className="flex-1 bg-transparent text-text-heading text-sm font-medium outline-none border-b border-border-hover focus:border-primary"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            className={`flex-1 text-sm font-medium cursor-text ${
              thread.status === 'resolved' ? 'text-text-muted line-through' : 'text-text-heading'
            }`}
          >
            {thread.title}
          </span>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(thread)}
          className="text-text-muted hover:text-danger text-sm cursor-pointer transition-colors shrink-0"
        >
          ×
        </button>
      </div>

      {/* Note */}
      {(thread.note || editingNote) && (
        <div className="ml-6 mt-1">
          {editingNote ? (
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={handleNoteBlur}
              onKeyDown={(e) => { if (e.key === 'Escape') { setNoteValue(thread.note || ''); setEditingNote(false) } }}
              className="w-full bg-transparent text-text-secondary text-xs outline-none resize-none min-h-[30px]"
              autoFocus
            />
          ) : (
            <p
              onClick={() => { setNoteValue(thread.note || ''); setEditingNote(true) }}
              className="text-xs text-text-secondary cursor-text"
            >
              {thread.note}
            </p>
          )}
        </div>
      )}

      {/* Add note link (if no note exists) */}
      {!thread.note && !editingNote && (
        <button
          onClick={() => setEditingNote(true)}
          className="ml-6 mt-1 text-[10px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
        >
          + add note
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/threads/PlotThreads.tsx
git commit -m "feat: add plot threads component with inline editing"
```

---

### Task 6: Mount Thread Tracker on Campaign Overview

**Files:**
- Modify: `app/src/features/campaigns/CampaignOverview.tsx`

- [ ] **Step 1: Add import**

Add to the imports in `app/src/features/campaigns/CampaignOverview.tsx`:

```typescript
import { PlotThreads } from '@/features/threads/PlotThreads'
```

- [ ] **Step 2: Mount PlotThreads after sessions section**

In `CampaignOverview.tsx`, find the sessions section closing `</div>` (around line 54) and add the plot threads section after it, before the initiative tracker:

```tsx
      {/* Plot threads */}
      <div className="mb-8">
        <PlotThreads campaignId={campaignId} />
      </div>

      <OrnamentalDivider />
```

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/campaigns/CampaignOverview.tsx
git commit -m "feat: mount plot threads on campaign overview page"
```

---

### Task 7: Build Verification & Manual Testing

**Files:** None (verification only)

- [ ] **Step 1: Full type check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 2: Production build**

```bash
cd app && npx vite build
```

- [ ] **Step 3: Manual testing checklist**

**Session Recap:**
1. Navigate to a completed session
2. Verify "Session complete — write a recap?" prompt appears
3. Click "Write Recap" → SceneEditor appears in edit mode
4. Write some content with bold, blockquotes, etc.
5. Click Save → recap saves and shows in read-only mode
6. Click Edit → edit mode returns with previous content
7. Verify recap is NOT visible on upcoming/in-progress sessions

**Plot Threads:**
1. Navigate to campaign overview
2. Verify "Plot Threads" section appears after sessions
3. Click "+ Add Thread" → inline form appears
4. Enter a title and optional note → click Add
5. Thread appears with amber left border
6. Click title to edit inline → blur to save
7. Click "+ add note" to add a note → blur to save
8. Click checkbox → thread moves to Resolved section
9. Click "Resolved (N)" to expand → thread shows dimmed
10. Uncheck → thread moves back to open
11. Click × → confirm dialog → thread deleted
