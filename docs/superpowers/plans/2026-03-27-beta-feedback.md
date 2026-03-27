# Beta Feedback & Bug Reporting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two in-app pages — a 4-step feedback wizard and a bug/idea reporter with Google Drive screenshot uploads — so beta testers can give structured feedback.

**Architecture:** Both pages are top-level authenticated routes (`/feedback`, `/report`) outside the campaign layout, similar to `/home`. Data stored in two new Supabase tables. Screenshots proxy through a Supabase Edge Function to Google Drive. The feedback wizard auto-detects feature usage by querying existing tables.

**Tech Stack:** React 19, TanStack Router + Query, Zustand, Supabase (PostgreSQL + RLS + Edge Functions), Google Drive API (service account), Tailwind CSS 4

---

### Task 1: Database Migration — Feedback & Bug Report Tables

**Files:**
- Create: `app/supabase/migrations/20260327120000_feedback.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- =============================================
-- Beta Feedback & Bug Reporting
-- =============================================

-- Feedback wizard responses (one per user)
create table feedback_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  step1 jsonb,
  step2 jsonb,
  step3 jsonb,
  step4 jsonb,
  current_step integer not null default 1,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table feedback_responses enable row level security;

create policy "Users can manage their own feedback"
  on feedback_responses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_feedback_responses_user on feedback_responses(user_id);

create trigger set_updated_at before update on feedback_responses
  for each row execute function update_updated_at();

-- Bug/idea reports (many per user)
create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug', 'feature', 'feedback')),
  title text not null,
  description text not null,
  severity text check (severity in ('blocking', 'annoying', 'minor')),
  page text,
  screenshot_ids jsonb default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'seen', 'resolved')),
  created_at timestamptz not null default now()
);

alter table bug_reports enable row level security;

create policy "Users can insert their own reports"
  on bug_reports for insert
  with check (user_id = auth.uid());

create policy "Users can read their own reports"
  on bug_reports for select
  using (user_id = auth.uid());

create index idx_bug_reports_user on bug_reports(user_id);
create index idx_bug_reports_type on bug_reports(type);
create index idx_bug_reports_created on bug_reports(created_at desc);
```

- [ ] **Step 2: Push the migration**

Run: `cd app && echo "Y" | npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add app/supabase/migrations/20260327120000_feedback.sql
git commit -m "feat: add feedback_responses and bug_reports tables"
```

---

### Task 2: Types & Constants

**Files:**
- Modify: `app/src/lib/types.ts`

- [ ] **Step 1: Add feedback types to types.ts**

Append to the end of `app/src/lib/types.ts`:

```typescript
// =============================================
// Beta Feedback
// =============================================

export type FeedbackStep1 = {
  role: string
  experience: string
  systems: string[]
  frequency: string
}

export type FeedbackStep2 = {
  detected_features: { name: string; count: number }[]
  ratings: Record<string, 'meh' | 'good' | 'love'>
  best_thing: string
  worst_thing: string
}

export type FeedbackStep3 = {
  wanted_features: string[]
  top_wish: string
  other_tools: string[]
}

export type FeedbackStep4 = {
  paid_tools: string[]
  monthly_spend: string
  fair_price: string
  anything_else: string
}

export type FeedbackResponse = {
  id: string
  user_id: string
  step1: FeedbackStep1 | null
  step2: FeedbackStep2 | null
  step3: FeedbackStep3 | null
  step4: FeedbackStep4 | null
  current_step: number
  completed: boolean
  created_at: string
  updated_at: string
}

export type BugReport = {
  id: string
  user_id: string
  type: 'bug' | 'feature' | 'feedback'
  title: string
  description: string
  severity: 'blocking' | 'annoying' | 'minor' | null
  page: string | null
  screenshot_ids: string[]
  status: 'new' | 'seen' | 'resolved'
  created_at: string
}

export const FEEDBACK_ROLES = [
  'Forever DM',
  'DM & Player',
  'Mostly Player',
  'New to TTRPGs',
] as const

export const FEEDBACK_EXPERIENCE = [
  'Less than a year',
  '1–3 years',
  '3–10 years',
  '10+ years',
] as const

export const FEEDBACK_SYSTEMS = [
  'D&D 5e',
  'D&D 5e (2024)',
  'Pathfinder 2e',
  'Call of Cthulhu',
  'Blades in the Dark',
] as const

export const FEEDBACK_FREQUENCY = [
  'Weekly',
  'Biweekly',
  'Monthly',
  'Irregularly',
  'Not currently running',
] as const

export const FEEDBACK_WANTED_FEATURES = [
  'In-game calendar',
  'Interactive maps',
  'Faction tracker',
  'NPC relationship web',
  'Session recap / notes',
  'Quest tracker',
  'Player-facing portal',
  'Discord integration',
  'Music / ambiance links',
  'AI-generated portraits',
  'XP / leveling tracker',
  'Shareable handouts',
  'Offline mode',
  'Mobile app',
  'World state changelog',
] as const

export const FEEDBACK_OTHER_TOOLS = [
  'Google Docs',
  'Notion',
  'OneNote',
  'Obsidian',
  'Pen & paper',
  'World Anvil',
  'Kanka',
] as const

export const FEEDBACK_PAID_TOOLS = [
  'D&D Beyond subscription',
  'D&D Beyond books',
  'Roll20',
  'Foundry VTT',
  'Fantasy Grounds',
  'World Anvil',
  'Kanka',
  'Owlbear Rodeo',
  "DM's Guild / DriveThruRPG",
  'Patreon (map makers, etc.)',
  'None — I only use free tools',
] as const

export const FEEDBACK_MONTHLY_SPEND = [
  '$0',
  '$1–5',
  '$5–15',
  '$15–30',
  '$30+',
] as const

export const FEEDBACK_FAIR_PRICE = [
  'Free only',
  '$3–5/mo',
  '$5–10/mo',
  '$10–15/mo',
  '$15+/mo',
] as const

export const REPORT_TYPES = ['bug', 'feature', 'feedback'] as const
export const REPORT_SEVERITIES = ['blocking', 'annoying', 'minor'] as const

export const APP_PAGES = [
  'Campaign Overview',
  'Sessions',
  'Session Timeline',
  'Characters',
  'Bestiary',
  'Spellbook',
  'Locations',
  'Generators',
  'Inspiration Board',
  'Initiative Tracker',
  'Quick Reference',
  'Command Palette',
  'Other',
] as const
```

- [ ] **Step 2: Commit**

```bash
git add app/src/lib/types.ts
git commit -m "feat: add feedback and bug report types and constants"
```

---

### Task 3: Icons — Add Feedback & Bug Icons

**Files:**
- Modify: `app/src/components/ui/icons.ts`

- [ ] **Step 1: Add icons to barrel file**

Append to the end of `app/src/components/ui/icons.ts`:

```typescript
// Feedback / beta
export { GiSpeechBubble } from 'react-icons/gi'    // 💬 feedback
export { GiBugNet } from 'react-icons/gi'            // 🐛 bug report
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/icons.ts
git commit -m "feat: add feedback and bug report icons to barrel"
```

---

### Task 4: Hooks — Feedback Wizard Data Layer

**Files:**
- Create: `app/src/features/feedback/useFeedback.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type {
  FeedbackResponse,
  FeedbackStep1,
  FeedbackStep2,
  FeedbackStep3,
  FeedbackStep4,
} from '@/lib/types'

// Fetch the user's existing feedback response (or null)
export function useFeedbackResponse() {
  return useQuery({
    queryKey: ['feedback-response'],
    queryFn: async (): Promise<FeedbackResponse | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('feedback_responses')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

// Detect which features the user has data in
export function useDetectedFeatures() {
  return useQuery({
    queryKey: ['detected-features'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uid = user.id

      // Query each table for counts — uses the GM ownership pattern
      const [
        campaigns,
        sessions,
        characters,
        monsters,
        spells,
        locations,
        inspiration,
      ] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('gm_id', uid),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('player_characters').select('id', { count: 'exact', head: true }),
        supabase.from('monsters').select('id', { count: 'exact', head: true }),
        supabase.from('spells').select('id', { count: 'exact', head: true }).eq('source', 'homebrew'),
        supabase.from('locations').select('id', { count: 'exact', head: true }),
        supabase.from('inspiration_items').select('id', { count: 'exact', head: true }),
      ])

      const features: { name: string; count: number }[] = []

      if (campaigns.count && campaigns.count > 0) features.push({ name: 'Campaigns', count: campaigns.count })
      if (sessions.count && sessions.count > 0) features.push({ name: 'Sessions', count: sessions.count })
      if (characters.count && characters.count > 0) features.push({ name: 'Characters', count: characters.count })
      if (monsters.count && monsters.count > 0) features.push({ name: 'Bestiary', count: monsters.count })
      if (spells.count && spells.count > 0) features.push({ name: 'Spellbook', count: spells.count })
      if (locations.count && locations.count > 0) features.push({ name: 'Locations', count: locations.count })
      if (inspiration.count && inspiration.count > 0) features.push({ name: 'Inspiration Board', count: inspiration.count })

      return features
    },
  })
}

// Save a single step (upsert)
export function useSaveFeedbackStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      step,
      data,
      currentStep,
    }: {
      step: 'step1' | 'step2' | 'step3' | 'step4'
      data: FeedbackStep1 | FeedbackStep2 | FeedbackStep3 | FeedbackStep4
      currentStep: number
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feedback_responses')
        .upsert(
          {
            user_id: user.id,
            [step]: data,
            current_step: currentStep,
          },
          { onConflict: 'user_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-response'] })
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to save')
    },
  })
}

// Mark feedback as completed
export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      step4,
    }: {
      step4: FeedbackStep4
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feedback_responses')
        .upsert(
          {
            user_id: user.id,
            step4,
            current_step: 4,
            completed: true,
          },
          { onConflict: 'user_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-response'] })
      useToastStore.getState().addToast('success', 'Thank you for your feedback!')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to submit')
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing ones).

- [ ] **Step 3: Commit**

```bash
git add app/src/features/feedback/useFeedback.ts
git commit -m "feat: add feedback wizard data hooks"
```

---

### Task 5: Hooks — Bug Reporter Data Layer

**Files:**
- Create: `app/src/features/feedback/useBugReports.ts`

- [ ] **Step 1: Create the bug report hooks file**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export function useSubmitBugReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      type: 'bug' | 'feature' | 'feedback'
      title: string
      description: string
      severity?: 'blocking' | 'annoying' | 'minor'
      page?: string
      screenshot_ids?: string[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user.id,
          type: input.type,
          title: input.title,
          description: input.description,
          severity: input.type === 'bug' ? input.severity : null,
          page: input.page || null,
          screenshot_ids: input.screenshot_ids || [],
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] })
      useToastStore.getState().addToast('success', 'Report filed — thanks for helping us improve.')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to submit report')
    },
  })
}

// Upload screenshot via Edge Function → Google Drive
export async function uploadScreenshot(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please select an image.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image too large. Maximum size is 5MB.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const formData = new FormData()
  formData.append('file', file)

  const { data: { publicUrl } } = supabase.functions.getFunctions
    ? { data: { publicUrl: '' } }
    : { data: { publicUrl: '' } }

  const response = await supabase.functions.invoke('upload-screenshot', {
    body: formData,
  })

  if (response.error) throw new Error(response.error.message || 'Upload failed')
  return response.data.fileId as string
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/features/feedback/useBugReports.ts
git commit -m "feat: add bug report hooks with screenshot upload"
```

---

### Task 6: Supabase Edge Function — Screenshot Upload to Google Drive

**Files:**
- Create: `app/supabase/functions/upload-screenshot/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')!)

// Create a JWT for Google API auth
async function getGoogleAccessToken(): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: GOOGLE_SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsignedToken = `${headerB64}.${claimB64}`

  // Import the private key and sign
  const pemContent = GOOGLE_SERVICE_ACCOUNT.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(unsignedToken),
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${unsignedToken}.${sigB64}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Parse the uploaded file
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 })
    }

    // Validate
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), { status: 400 })
    }

    // Upload to Google Drive
    const accessToken = await getGoogleAccessToken()
    const fileBytes = await file.arrayBuffer()

    const metadata = {
      name: `${user.id}-${Date.now()}-${file.name}`,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    }

    const boundary = 'feedback_upload_boundary'
    const metadataPart = JSON.stringify(metadata)
    const body = new Uint8Array([
      ...new TextEncoder().encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`
      ),
      ...new Uint8Array(fileBytes),
      ...new TextEncoder().encode(`\r\n--${boundary}--`),
    ])

    const driveResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    )

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text()
      throw new Error(`Google Drive upload failed: ${errorText}`)
    }

    const driveData = await driveResponse.json()

    return new Response(
      JSON.stringify({ fileId: driveData.id, fileName: driveData.name }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
})
```

- [ ] **Step 2: Deploy the edge function**

Run: `cd app && npx supabase functions deploy upload-screenshot --no-verify-jwt`

Note: `--no-verify-jwt` because we verify auth manually inside the function. The function needs these secrets set in Supabase dashboard:
- `GOOGLE_DRIVE_FOLDER_ID` — the ID of the shared Drive folder
- `GOOGLE_SERVICE_ACCOUNT_JSON` — the full service account credentials JSON

- [ ] **Step 3: Commit**

```bash
git add app/supabase/functions/upload-screenshot/index.ts
git commit -m "feat: add edge function for Google Drive screenshot upload"
```

---

### Task 7: ChipSelect Component — Reusable Selection Input

**Files:**
- Create: `app/src/components/ui/ChipSelect.tsx`

The feedback wizard uses chip-based selection extensively. Build one reusable component.

- [ ] **Step 1: Create the ChipSelect component**

```tsx
import { motion } from '@/components/motion'

interface ChipSelectProps {
  options: readonly string[]
  selected: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (value: string) => void
}

export function ChipSelect({
  options,
  selected,
  onChange,
  multiple = false,
  allowOther = false,
  otherValue = '',
  onOtherChange,
}: ChipSelectProps) {
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])

  const handleClick = (option: string) => {
    if (multiple) {
      const current = Array.isArray(selected) ? selected : []
      if (current.includes(option)) {
        onChange(current.filter((v) => v !== option))
      } else {
        onChange([...current, option])
      }
    } else {
      onChange(option)
    }
  }

  const isOtherSelected = selectedSet.has('Other')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedSet.has(option)
          return (
            <motion.button
              key={option}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(option)}
              className={`
                px-3 py-1.5 rounded-[--radius-md] text-sm font-medium
                transition-colors duration-[--duration-fast] cursor-pointer
                ${isSelected
                  ? 'bg-primary-ghost border border-primary text-primary-light'
                  : 'bg-bg-raised border border-border text-text-muted hover:text-text-body hover:border-border-hover'
                }
              `}
            >
              {option}
            </motion.button>
          )
        })}
        {allowOther && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick('Other')}
            className={`
              px-3 py-1.5 rounded-[--radius-md] text-sm font-medium
              transition-colors duration-[--duration-fast] cursor-pointer
              ${isOtherSelected
                ? 'bg-primary-ghost border border-primary text-primary-light'
                : 'bg-bg-raised border border-border text-text-muted hover:text-text-body hover:border-border-hover'
              }
            `}
          >
            Other
          </motion.button>
        )}
      </div>
      {allowOther && isOtherSelected && onOtherChange && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Please specify..."
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ui/ChipSelect.tsx
git commit -m "feat: add reusable ChipSelect component"
```

---

### Task 8: Feedback Wizard Page — Shell & Step 1

**Files:**
- Create: `app/src/features/feedback/FeedbackWizardPage.tsx`

- [ ] **Step 1: Create the wizard page with shell and Step 1**

```tsx
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiSpeechBubble, GiCastle } from '@/components/ui/icons'
import { FadeIn } from '@/components/motion'
import { useFeedbackResponse, useDetectedFeatures, useSaveFeedbackStep, useSubmitFeedback } from './useFeedback'
import {
  FEEDBACK_ROLES,
  FEEDBACK_EXPERIENCE,
  FEEDBACK_SYSTEMS,
  FEEDBACK_FREQUENCY,
  FEEDBACK_WANTED_FEATURES,
  FEEDBACK_OTHER_TOOLS,
  FEEDBACK_PAID_TOOLS,
  FEEDBACK_MONTHLY_SPEND,
  FEEDBACK_FAIR_PRICE,
} from '@/lib/types'
import type {
  FeedbackStep1,
  FeedbackStep2,
  FeedbackStep3,
  FeedbackStep4,
} from '@/lib/types'

const STEP_LABELS = ['About You', 'Your Experience', "What's Missing", 'D&D Spending']

export function FeedbackWizardPage() {
  const { data: existing, isLoading } = useFeedbackResponse()
  const saveFeedbackStep = useSaveFeedbackStep()
  const submitFeedback = useSubmitFeedback()

  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)

  // Step 1 state
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState('')
  const [systems, setSystems] = useState<string[]>([])
  const [systemOther, setSystemOther] = useState('')
  const [frequency, setFrequency] = useState('')

  // Step 2 state
  const [ratings, setRatings] = useState<Record<string, 'meh' | 'good' | 'love'>>({})
  const [bestThing, setBestThing] = useState('')
  const [worstThing, setWorstThing] = useState('')

  // Step 3 state
  const [wantedFeatures, setWantedFeatures] = useState<string[]>([])
  const [topWish, setTopWish] = useState('')
  const [otherTools, setOtherTools] = useState<string[]>([])
  const [otherToolText, setOtherToolText] = useState('')

  // Step 4 state
  const [paidTools, setPaidTools] = useState<string[]>([])
  const [paidToolOther, setPaidToolOther] = useState('')
  const [monthlySpend, setMonthlySpend] = useState('')
  const [fairPrice, setFairPrice] = useState('')
  const [anythingElse, setAnythingElse] = useState('')

  // Restore from existing response
  useEffect(() => {
    if (!existing) return
    if (existing.completed) {
      setSubmitted(true)
      return
    }
    setStep(existing.current_step)
    if (existing.step1) {
      setRole(existing.step1.role)
      setExperience(existing.step1.experience)
      setSystems(existing.step1.systems.filter((s) => ![...FEEDBACK_SYSTEMS].includes(s as typeof FEEDBACK_SYSTEMS[number]) ? false : true))
      const otherSys = existing.step1.systems.find((s) => ![...FEEDBACK_SYSTEMS].includes(s as typeof FEEDBACK_SYSTEMS[number]))
      if (otherSys) { setSystems((prev) => [...prev, 'Other']); setSystemOther(otherSys) }
      setFrequency(existing.step1.frequency)
    }
    if (existing.step2) {
      setRatings(existing.step2.ratings)
      setBestThing(existing.step2.best_thing)
      setWorstThing(existing.step2.worst_thing)
    }
    if (existing.step3) {
      setWantedFeatures(existing.step3.wanted_features)
      setTopWish(existing.step3.top_wish)
      setOtherTools(existing.step3.other_tools.filter((t) => ![...FEEDBACK_OTHER_TOOLS].includes(t as typeof FEEDBACK_OTHER_TOOLS[number]) ? false : true))
      const otherTool = existing.step3.other_tools.find((t) => ![...FEEDBACK_OTHER_TOOLS].includes(t as typeof FEEDBACK_OTHER_TOOLS[number]))
      if (otherTool) { setOtherTools((prev) => [...prev, 'Other']); setOtherToolText(otherTool) }
    }
    if (existing.step4) {
      setPaidTools(existing.step4.paid_tools.filter((t) => ![...FEEDBACK_PAID_TOOLS].includes(t as typeof FEEDBACK_PAID_TOOLS[number]) ? false : true))
      const otherPaid = existing.step4.paid_tools.find((t) => ![...FEEDBACK_PAID_TOOLS].includes(t as typeof FEEDBACK_PAID_TOOLS[number]))
      if (otherPaid) { setPaidTools((prev) => [...prev, 'Other']); setPaidToolOther(otherPaid) }
      setMonthlySpend(existing.step4.monthly_spend)
      setFairPrice(existing.step4.fair_price)
      setAnythingElse(existing.step4.anything_else)
    }
  }, [existing])

  const buildStep1 = (): FeedbackStep1 => {
    const finalSystems = systems.filter((s) => s !== 'Other')
    if (systems.includes('Other') && systemOther.trim()) finalSystems.push(systemOther.trim())
    return { role, experience, systems: finalSystems, frequency }
  }

  const handleNext = async () => {
    if (step === 1) {
      await saveFeedbackStep.mutateAsync({ step: 'step1', data: buildStep1(), currentStep: 2 })
      setStep(2)
    } else if (step === 2) {
      const step2Data: FeedbackStep2 = { detected_features: detectedFeatures || [], ratings, best_thing: bestThing, worst_thing: worstThing }
      await saveFeedbackStep.mutateAsync({ step: 'step2', data: step2Data, currentStep: 3 })
      setStep(3)
    } else if (step === 3) {
      const finalTools = otherTools.filter((t) => t !== 'Other')
      if (otherTools.includes('Other') && otherToolText.trim()) finalTools.push(otherToolText.trim())
      const step3Data: FeedbackStep3 = { wanted_features: wantedFeatures, top_wish: topWish, other_tools: finalTools }
      await saveFeedbackStep.mutateAsync({ step: 'step3', data: step3Data, currentStep: 4 })
      setStep(4)
    } else if (step === 4) {
      const finalPaid = paidTools.filter((t) => t !== 'Other')
      if (paidTools.includes('Other') && paidToolOther.trim()) finalPaid.push(paidToolOther.trim())
      const step4Data: FeedbackStep4 = { paid_tools: finalPaid, monthly_spend: monthlySpend, fair_price: fairPrice, anything_else: anythingElse }
      await submitFeedback.mutateAsync({ step4: step4Data })
      setSubmitted(true)
    }
  }

  const { data: detectedFeatures } = useDetectedFeatures()

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-bg-deep flex items-center justify-center">
        <div className="text-3xl torch-flicker"><GameIcon icon={GiSpeechBubble} size="3xl" /></div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-bg-deep">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
          <Link to="/home" className="text-text-muted hover:text-text-body text-sm">
            <GameIcon icon={GiCastle} size="base" /> Back to campaigns
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <FadeIn>
            <div className="bg-primary-ghost/30 border border-primary/20 rounded-[--radius-xl] p-8">
              <h2 className="text-2xl mb-2 gold-foil">Thank you for helping shape Book of Tricks.</h2>
              <p className="text-text-secondary">
                As a beta tester, you'll always have free access — no subscription needed, ever. We mean it.
              </p>
              <div className="mt-6">
                <Link to="/home">
                  <Button variant="secondary">Back to campaigns</Button>
                </Link>
              </div>
            </div>
          </FadeIn>
        </main>
      </div>
    )
  }

  const isStepValid = () => {
    if (step === 1) return role && experience && systems.length > 0 && frequency
    if (step === 2) return true // ratings optional
    if (step === 3) return true // all optional
    if (step === 4) return monthlySpend && fairPrice
    return false
  }

  return (
    <div className="min-h-dvh bg-bg-deep">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
        <Link to="/home" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1">
          <GameIcon icon={GiCastle} size="base" /> Back to campaigns
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:px-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => i + 1 < step && setStep(i + 1)}
                className={`
                  transition-colors cursor-pointer
                  ${i + 1 === step ? 'text-primary-light font-medium' : ''}
                  ${i + 1 < step ? 'text-text-secondary hover:text-text-body' : ''}
                  ${i + 1 > step ? 'text-text-muted' : ''}
                `}
                disabled={i + 1 > step}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="h-1.5 bg-bg-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        <FadeIn key={step}>
          {step === 1 && (
            <Step1AboutYou
              role={role} setRole={setRole}
              experience={experience} setExperience={setExperience}
              systems={systems} setSystems={setSystems}
              systemOther={systemOther} setSystemOther={setSystemOther}
              frequency={frequency} setFrequency={setFrequency}
            />
          )}
          {step === 2 && (
            <Step2Experience
              detectedFeatures={detectedFeatures || []}
              ratings={ratings} setRatings={setRatings}
              bestThing={bestThing} setBestThing={setBestThing}
              worstThing={worstThing} setWorstThing={setWorstThing}
            />
          )}
          {step === 3 && (
            <Step3Missing
              wantedFeatures={wantedFeatures} setWantedFeatures={setWantedFeatures}
              topWish={topWish} setTopWish={setTopWish}
              otherTools={otherTools} setOtherTools={setOtherTools}
              otherToolText={otherToolText} setOtherToolText={setOtherToolText}
            />
          )}
          {step === 4 && (
            <Step4Spending
              paidTools={paidTools} setPaidTools={setPaidTools}
              paidToolOther={paidToolOther} setPaidToolOther={setPaidToolOther}
              monthlySpend={monthlySpend} setMonthlySpend={setMonthlySpend}
              fairPrice={fairPrice} setFairPrice={setFairPrice}
              anythingElse={anythingElse} setAnythingElse={setAnythingElse}
            />
          )}
        </FadeIn>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || saveFeedbackStep.isPending || submitFeedback.isPending}
          >
            {step === 4 ? 'Submit' : 'Next'}
          </Button>
        </div>
      </main>
    </div>
  )
}

// =============================================
// Step Components
// =============================================

function Step1AboutYou({
  role, setRole, experience, setExperience,
  systems, setSystems, systemOther, setSystemOther,
  frequency, setFrequency,
}: {
  role: string; setRole: (v: string) => void
  experience: string; setExperience: (v: string) => void
  systems: string[]; setSystems: (v: string[]) => void
  systemOther: string; setSystemOther: (v: string) => void
  frequency: string; setFrequency: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-1 gold-foil">Welcome, adventurer.</h2>
        <p className="text-text-secondary text-sm">
          Your feedback shapes what we build next. Beta testers will always have free access — this is your tool too.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What best describes your role?</label>
        <ChipSelect options={FEEDBACK_ROLES} selected={role} onChange={(v) => setRole(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">How long have you been running games?</label>
        <ChipSelect options={FEEDBACK_EXPERIENCE} selected={experience} onChange={(v) => setExperience(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">
          What systems do you play? <span className="text-text-muted">(select all that apply)</span>
        </label>
        <ChipSelect
          options={FEEDBACK_SYSTEMS}
          selected={systems}
          onChange={(v) => setSystems(v as string[])}
          multiple
          allowOther
          otherValue={systemOther}
          onOtherChange={setSystemOther}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">How often do you run sessions?</label>
        <ChipSelect options={FEEDBACK_FREQUENCY} selected={frequency} onChange={(v) => setFrequency(v as string)} />
      </div>
    </div>
  )
}

function Step2Experience({
  detectedFeatures, ratings, setRatings,
  bestThing, setBestThing, worstThing, setWorstThing,
}: {
  detectedFeatures: { name: string; count: number }[]
  ratings: Record<string, 'meh' | 'good' | 'love'>
  setRatings: (v: Record<string, 'meh' | 'good' | 'love'>) => void
  bestThing: string; setBestThing: (v: string) => void
  worstThing: string; setWorstThing: (v: string) => void
}) {
  const ratingOptions: { value: 'meh' | 'good' | 'love'; label: string }[] = [
    { value: 'meh', label: '😐' },
    { value: 'good', label: '🙂' },
    { value: 'love', label: '🤩' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl gold-foil">Your Experience</h2>

      {detectedFeatures.length > 0 && (
        <div className="bg-primary-ghost/30 border border-primary/20 rounded-[--radius-lg] p-4">
          <p className="text-xs uppercase tracking-wider text-primary-light mb-2 font-medium">Features you've used</p>
          <div className="flex flex-wrap gap-2">
            {detectedFeatures.map((f) => (
              <span key={f.name} className="px-2.5 py-1 bg-primary-ghost border border-primary/30 rounded-[--radius-sm] text-primary-light text-sm">
                {f.name} ({f.count})
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">Auto-detected from your account — not everything? No worries, just rate what you've tried.</p>
        </div>
      )}

      {detectedFeatures.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm text-text-secondary font-medium">Rate the features you've used</label>
          {detectedFeatures.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between bg-bg-raised rounded-[--radius-md] px-3 py-2">
              <span className="text-sm text-text-body">{feature.name}</span>
              <div className="flex gap-1">
                {ratingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRatings({ ...ratings, [feature.name]: opt.value })}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-[--radius-sm] text-sm cursor-pointer transition-colors
                      ${ratings[feature.name] === opt.value
                        ? 'bg-primary-ghost border border-primary text-primary-light'
                        : 'border border-border text-text-muted hover:border-border-hover'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What's the best thing about Book of Tricks so far?</label>
        <textarea
          value={bestThing}
          onChange={(e) => setBestThing(e.target.value)}
          placeholder="Optional — a sentence or two is great"
          rows={3}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What's the most frustrating thing?</label>
        <textarea
          value={worstThing}
          onChange={(e) => setWorstThing(e.target.value)}
          placeholder="Optional — bugs, confusing UX, missing stuff, anything"
          rows={3}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>
    </div>
  )
}

function Step3Missing({
  wantedFeatures, setWantedFeatures,
  topWish, setTopWish,
  otherTools, setOtherTools,
  otherToolText, setOtherToolText,
}: {
  wantedFeatures: string[]; setWantedFeatures: (v: string[]) => void
  topWish: string; setTopWish: (v: string) => void
  otherTools: string[]; setOtherTools: (v: string[]) => void
  otherToolText: string; setOtherToolText: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl gold-foil">What Would Make This Your Go-To Tool?</h2>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">
          Which of these would you actually use? <span className="text-text-muted">(select all that apply)</span>
        </label>
        <p className="text-xs text-text-muted">These are features we're considering — your picks help us prioritize.</p>
        <ChipSelect options={FEEDBACK_WANTED_FEATURES} selected={wantedFeatures} onChange={(v) => setWantedFeatures(v as string[])} multiple />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">If you could add ONE feature right now, what would it be?</label>
        <textarea
          value={topWish}
          onChange={(e) => setTopWish(e.target.value)}
          placeholder="Your #1 wish — doesn't have to be from the list above"
          rows={2}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What do you currently use outside Book of Tricks for session prep?</label>
        <ChipSelect
          options={FEEDBACK_OTHER_TOOLS}
          selected={otherTools}
          onChange={(v) => setOtherTools(v as string[])}
          multiple
          allowOther
          otherValue={otherToolText}
          onOtherChange={setOtherToolText}
        />
      </div>
    </div>
  )
}

function Step4Spending({
  paidTools, setPaidTools, paidToolOther, setPaidToolOther,
  monthlySpend, setMonthlySpend,
  fairPrice, setFairPrice,
  anythingElse, setAnythingElse,
}: {
  paidTools: string[]; setPaidTools: (v: string[]) => void
  paidToolOther: string; setPaidToolOther: (v: string) => void
  monthlySpend: string; setMonthlySpend: (v: string) => void
  fairPrice: string; setFairPrice: (v: string) => void
  anythingElse: string; setAnythingElse: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl gold-foil">D&D Tools & Spending</h2>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">
          What D&D tools or services do you currently pay for? <span className="text-text-muted">(select all that apply)</span>
        </label>
        <ChipSelect
          options={FEEDBACK_PAID_TOOLS}
          selected={paidTools}
          onChange={(v) => setPaidTools(v as string[])}
          multiple
          allowOther
          otherValue={paidToolOther}
          onOtherChange={setPaidToolOther}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">Roughly how much do you spend per month on TTRPG tools/content?</label>
        <ChipSelect options={FEEDBACK_MONTHLY_SPEND} selected={monthlySpend} onChange={(v) => setMonthlySpend(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">If Book of Tricks had everything you needed, what would feel like a fair monthly price?</label>
        <ChipSelect options={FEEDBACK_FAIR_PRICE} selected={fairPrice} onChange={(v) => setFairPrice(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">Anything else you'd like us to know?</label>
        <textarea
          value={anythingElse}
          onChange={(e) => setAnythingElse(e.target.value)}
          placeholder="Optional — wild ideas, complaints, encouragement, all welcome"
          rows={3}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/feedback/FeedbackWizardPage.tsx
git commit -m "feat: add feedback wizard page with all 4 steps"
```

---

### Task 9: Bug Reporter Page

**Files:**
- Create: `app/src/features/feedback/ReportPage.tsx`

- [ ] **Step 1: Create the bug reporter page**

```tsx
import { useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiBugNet, GiCastle } from '@/components/ui/icons'
import { FadeIn } from '@/components/motion'
import { useSubmitBugReport, uploadScreenshot } from './useBugReports'
import { REPORT_TYPES, REPORT_SEVERITIES, APP_PAGES } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Idea',
  feedback: 'General Feedback',
}

export function ReportPage() {
  const submitReport = useSubmitBugReport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<'bug' | 'feature' | 'feedback'>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'blocking' | 'annoying' | 'minor'>('annoying')
  const [page, setPage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    const valid = newFiles.filter((f) => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 5 * 1024 * 1024) return false
      return true
    })
    setFiles((prev) => [...prev, ...valid].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let screenshotIds: string[] = []

    if (files.length > 0) {
      setUploading(true)
      try {
        screenshotIds = await Promise.all(files.map((f) => uploadScreenshot(f)))
      } catch {
        setUploading(false)
        return
      }
      setUploading(false)
    }

    await submitReport.mutateAsync({
      type,
      title,
      description,
      severity: type === 'bug' ? severity : undefined,
      page: page || undefined,
      screenshot_ids: screenshotIds,
    })

    setSubmitted(true)
  }

  const resetForm = () => {
    setType('bug')
    setTitle('')
    setDescription('')
    setSeverity('annoying')
    setPage('')
    setFiles([])
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-bg-deep">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
          <Link to="/home" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1">
            <GameIcon icon={GiCastle} size="base" /> Back to campaigns
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <FadeIn>
            <div className="bg-primary-ghost/30 border border-primary/20 rounded-[--radius-xl] p-8">
              <h2 className="text-2xl mb-2 gold-foil">Report filed — thanks for helping us improve.</h2>
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="secondary" onClick={resetForm}>File another</Button>
                <Link to="/home"><Button variant="ghost">Back to campaigns</Button></Link>
              </div>
            </div>
          </FadeIn>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg-deep">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
        <Link to="/home" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1">
          <GameIcon icon={GiCastle} size="base" /> Back to campaigns
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:px-8">
        <div className="flex items-center gap-2 mb-6">
          <GameIcon icon={GiBugNet} size="xl" />
          <h2 className="text-2xl">Report Bug / Share Idea</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">What kind of report?</label>
            <ChipSelect
              options={REPORT_TYPES.map((t) => TYPE_LABELS[t])}
              selected={TYPE_LABELS[type]}
              onChange={(v) => {
                const key = Object.entries(TYPE_LABELS).find(([, label]) => label === v)?.[0]
                if (key) setType(key as 'bug' | 'feature' | 'feedback')
              }}
            />
          </div>

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            maxLength={120}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'bug' ? 'What happened? What did you expect?' : type === 'feature' ? 'What would you like and why?' : 'Share your thoughts...'}
              rows={5}
              required
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
            />
          </div>

          {type === 'bug' && (
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">Severity</label>
              <ChipSelect
                options={REPORT_SEVERITIES.map((s) => s.charAt(0).toUpperCase() + s.slice(1))}
                selected={severity.charAt(0).toUpperCase() + severity.slice(1)}
                onChange={(v) => setSeverity((v as string).toLowerCase() as 'blocking' | 'annoying' | 'minor')}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">
              Which page or feature? <span className="text-text-muted">(optional)</span>
            </label>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm"
            >
              <option value="">Select...</option>
              {APP_PAGES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Screenshot upload */}
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">
              Screenshots <span className="text-text-muted">(optional, max 5)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative bg-bg-raised border border-border rounded-[--radius-md] p-2 flex items-center gap-2 text-sm">
                  <span className="text-text-body truncate max-w-[150px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-text-muted hover:text-danger text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add screenshot
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={!title.trim() || !description.trim() || submitReport.isPending || uploading}
            >
              {uploading ? 'Uploading screenshots...' : submitReport.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/feedback/ReportPage.tsx
git commit -m "feat: add bug/idea reporter page with screenshot upload"
```

---

### Task 10: Router — Add Feedback & Report Routes

**Files:**
- Modify: `app/src/routes/router.tsx`

- [ ] **Step 1: Add imports at top of router.tsx**

After the existing import block (after line 22, the `useAuth` import), add:

```typescript
import { FeedbackWizardPage } from '@/features/feedback/FeedbackWizardPage'
import { ReportPage } from '@/features/feedback/ReportPage'
```

- [ ] **Step 2: Add route definitions**

After the `homeRoute` definition (after line 74), add:

```typescript
// Protected: Feedback wizard
const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feedback',
  component: FeedbackWizardPage,
  beforeLoad: () => {
    const { user, loading } = useAuth.getState()
    if (!loading && !user) {
      throw redirect({ to: '/' })
    }
  },
})

// Protected: Bug/idea reporter
const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/report',
  component: ReportPage,
  beforeLoad: () => {
    const { user, loading } = useAuth.getState()
    if (!loading && !user) {
      throw redirect({ to: '/' })
    }
  },
})
```

- [ ] **Step 3: Add routes to route tree**

In the `routeTree` definition, add `feedbackRoute` and `reportRoute` alongside `loginRoute` and `homeRoute`:

Change from:
```typescript
const routeTree = rootRoute.addChildren([
  loginRoute,
  homeRoute,
  campaignRoute.addChildren([
```

To:
```typescript
const routeTree = rootRoute.addChildren([
  loginRoute,
  homeRoute,
  feedbackRoute,
  reportRoute,
  campaignRoute.addChildren([
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/routes/router.tsx
git commit -m "feat: add /feedback and /report routes"
```

---

### Task 11: Sidebar — Add Beta Section

**Files:**
- Modify: `app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add icon imports**

In the icon imports (line 7-10), add `GiSpeechBubble` and `GiBugNet`:

Change from:
```typescript
import {
  GiCrossedSwords, GiThreeFriends, GiSpikedDragonHead, GiSparkles,
  GiPositionMarker, GiRollingDices, GiNotebook, GiScrollUnfurled, GiCastle,
  GiOpenBook,
} from '@/components/ui/icons'
```

To:
```typescript
import {
  GiCrossedSwords, GiThreeFriends, GiSpikedDragonHead, GiSparkles,
  GiPositionMarker, GiRollingDices, GiNotebook, GiScrollUnfurled, GiCastle,
  GiOpenBook, GiSpeechBubble, GiBugNet,
} from '@/components/ui/icons'
```

- [ ] **Step 2: Add beta nav items**

After the `campaignNav` array (after line 39), add:

```typescript
const betaNav: NavItem[] = [
  { icon: GiSpeechBubble, label: 'Give Feedback', to: '/feedback' },
  { icon: GiBugNet, label: 'Report Bug / Idea', to: '/report' },
]
```

- [ ] **Step 3: Render beta section in sidebar**

After the campaign nav `</nav>` (line 100), before the bottom actions `<div>` (line 103), add a beta section:

```tsx
      {/* Beta section */}
      <div className="px-2 pb-2">
        <div className={`text-[10px] uppercase tracking-wider text-text-muted mb-1 ${expanded ? 'px-3' : 'text-center'}`}>
          {expanded ? 'Beta' : '·'}
        </div>
        {betaNav.map((item) => {
          const isActive = currentPath === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`
                flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
                transition-colors duration-[--duration-fast]
                ${expanded ? 'px-3' : 'justify-center'}
                ${isActive
                  ? 'bg-primary-ghost text-primary-light'
                  : 'text-text-muted hover:text-text-body hover:bg-bg-raised'
                }
              `}
              title={expanded ? undefined : item.label}
            >
              <GameIcon icon={item.icon} size="base" />
              {expanded && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/layout/Sidebar.tsx
git commit -m "feat: add Beta section to sidebar with feedback and report links"
```

---

### Task 12: HomePage — Add Beta Tester CTA

**Files:**
- Modify: `app/src/features/campaigns/HomePage.tsx`

- [ ] **Step 1: Add a beta tester banner**

After the existing imports, add:

```typescript
import { GiSpeechBubble, GiBugNet } from '@/components/ui/icons'
```

Then, in the page content (after the campaigns list section, before the `InspirationBoard` section), add a beta banner:

```tsx
        {/* Beta tester CTA */}
        <div className="mt-12 mb-8">
          <OrnamentalDivider />
          <div className="mt-8 bg-primary-ghost/20 border border-primary/20 rounded-[--radius-lg] p-6 text-center">
            <h3 className="text-lg mb-2 gold-foil">Help Shape Book of Tricks</h3>
            <p className="text-text-secondary text-sm mb-4">
              Your feedback directly shapes what we build next. Beta testers get free access forever.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/feedback">
                <Button variant="primary" size="sm">
                  <GameIcon icon={GiSpeechBubble} size="sm" /> Give Feedback
                </Button>
              </Link>
              <Link to="/report">
                <Button variant="secondary" size="sm">
                  <GameIcon icon={GiBugNet} size="sm" /> Report Bug / Idea
                </Button>
              </Link>
            </div>
          </div>
        </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/campaigns/HomePage.tsx
git commit -m "feat: add beta tester CTA banner to home page"
```

---

### Task 13: Build & Smoke Test

**Files:** None — validation only

- [ ] **Step 1: Run TypeScript check**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run the build**

Run: `cd app && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Start dev server and test**

Run: `cd app && npm run dev`

Manually verify:
1. Navigate to `/#/feedback` — wizard loads, progress bar shows
2. Fill out Step 1 chips, click Next — saves and advances
3. Step 2 shows auto-detected features (if you have data)
4. Complete all 4 steps — shows thank you banner
5. Navigate to `/#/report` — form loads
6. Fill out a bug report — submits successfully
7. Sidebar shows Beta section with both links
8. Home page shows beta CTA banner

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
