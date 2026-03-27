# Beta Feedback & Bug Reporting — Design Spec

**Date:** 2026-03-27
**Status:** Draft

## Overview

Two in-app pages for collecting beta tester input:

1. **Feedback Wizard** (`/feedback`) — structured 4-step survey for understanding who testers are, what they think of the tool, what's missing, and willingness to pay
2. **Bug & Feedback Reporter** (`/report`) — lightweight form for filing bugs or ideas with screenshot uploads, backed by Google Drive for file storage

Both pages are authenticated and accessible from the sidebar.

---

## 1. Feedback Wizard

### Route & Access

- **Route:** `/feedback`
- **Auth:** Required — ties responses to user account and enables usage detection
- **Entry points:** Sidebar link, direct URL shared with testers
- **One response per user:** Upserts on resubmit so testers can update their answers

### Wizard Structure

4-step wizard with:
- **Progress bar** at top showing current step and completion (gold fill, matches app design tokens)
- **Back / Next navigation** — can jump to any completed step
- **Auto-save** — progress persists to Supabase so testers can leave and return
- **Submit** on final step

### Step 1: About You

Establishes tester profile for segmenting responses.

| Question | Input Type | Options |
|----------|-----------|---------|
| What best describes your role? | Single-select chips | Forever DM, DM & Player, Mostly Player, New to TTRPGs |
| How long have you been running games? | Single-select chips | Less than a year, 1–3 years, 3–10 years, 10+ years |
| What systems do you play? | Multi-select chips | D&D 5e, D&D 5e (2024), Pathfinder 2e, Call of Cthulhu, Blades in the Dark, Other (free-text) |
| How often do you run sessions? | Single-select chips | Weekly, Biweekly, Monthly, Irregularly, Not currently running |

### Step 2: Your Experience

Rates features they've actually used, informed by auto-detected usage data.

**Auto-detected features box:**
- Gold-bordered card at top of step
- Queries existing Supabase tables to detect which features the user has data in:
  - `campaigns` → "Campaigns (N)"
  - `sessions` → "Sessions (N)"
  - `timeline_blocks` → "Timeline"
  - `bestiary` → "Bestiary (N)"
  - `initiative_sessions` → "Initiative Tracker"
  - `characters` → "Characters (N)"
  - `locations` → "Locations (N)"
  - `spells` (user-created) → "Spellbook"
  - `inventory_items` → "Inventory"
  - `threads` → "Plot Threads"
  - `scratchpad_items` → "Inspiration Board"
- Shows feature name with count where applicable
- Note: "Auto-detected from your account — not everything? No worries, just rate what you've tried."

**Questions:**

| Question | Input Type | Notes |
|----------|-----------|-------|
| Rate the features you've used | 3-point scale per feature (meh / good / love it) | Only shows features detected in the auto-scan |
| What's the best thing about Book of Tricks so far? | Free-text (optional) | Placeholder: "A sentence or two is great" |
| What's the most frustrating thing? | Free-text (optional) | Placeholder: "Bugs, confusing UX, missing stuff, anything" |

### Step 3: What Would Make This Your Go-To Tool?

Feature prioritization and competitive landscape.

| Question | Input Type | Options |
|----------|-----------|---------|
| Which of these would you actually use? | Multi-select chips | In-game calendar, Interactive maps, Faction tracker, NPC relationship web, Session recap / notes, Quest tracker, Player-facing portal, Discord integration, Music / ambiance links, AI-generated portraits, XP / leveling tracker, Shareable handouts, Offline mode, Mobile app, World state changelog |
| If you could add ONE feature right now, what would it be? | Free-text | "Your #1 wish — doesn't have to be from the list above" |
| What do you currently use outside Book of Tricks for session prep? | Multi-select chips | Google Docs, Notion, OneNote, Obsidian, Pen & paper, World Anvil, Kanka, Other (free-text) |

### Step 4: D&D Spending & Final Thoughts

Market research and pricing signal.

| Question | Input Type | Options |
|----------|-----------|---------|
| What D&D tools or services do you currently pay for? | Multi-select chips | D&D Beyond subscription, D&D Beyond books, Roll20, Foundry VTT, Fantasy Grounds, World Anvil, Kanka, Owlbear Rodeo, DM's Guild / DriveThruRPG, Patreon (map makers, etc.), None — I only use free tools, Other (free-text) |
| Roughly how much do you spend per month on TTRPG tools/content? | Single-select chips | $0, $1–5, $5–15, $15–30, $30+ |
| If Book of Tricks had everything you needed, what would feel like a fair monthly price? | Single-select chips | Free only, $3–5/mo, $5–10/mo, $10–15/mo, $15+/mo |
| Anything else you'd like us to know? | Free-text (optional) | "Wild ideas, complaints, encouragement, all welcome" |

**Closing banner** (shown after submit): "Thank you for helping shape Book of Tricks. As a beta tester, you'll always have free access — no subscription needed, ever."

### Data Model

**Table: `feedback_responses`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users, unique constraint |
| `step1` | jsonb | `{ role, experience, systems, frequency }` |
| `step2` | jsonb | `{ detected_features, ratings, best_thing, worst_thing }` |
| `step3` | jsonb | `{ wanted_features, top_wish, other_tools }` |
| `step4` | jsonb | `{ paid_tools, monthly_spend, fair_price, anything_else }` |
| `current_step` | int | For auto-save / resume (1–4) |
| `completed` | boolean | False until final submit |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

- RLS: Users can only read/write their own row
- Upsert on `user_id` — resubmitting updates the existing response

### Usage Detection

No new tracking infrastructure. Simple count queries against existing tables:

```sql
-- Example: detect which features a user has touched
SELECT
  (SELECT count(*) FROM campaigns WHERE user_id = $1) as campaigns,
  (SELECT count(*) FROM sessions WHERE user_id = $1) as sessions,
  (SELECT count(*) FROM bestiary WHERE user_id = $1) as bestiary,
  -- ... etc for each feature table
```

Results are fetched once when Step 2 loads and displayed in the auto-detected box. Not stored — always live.

---

## 2. Bug & Feedback Reporter

### Route & Access

- **Route:** `/report`
- **Auth:** Required — attaches user identity and usage context
- **Entry points:** Sidebar link, direct URL
- **Multiple submissions:** Users can file as many reports as they want

### Form Fields

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| Type | Single-select chips | Yes | Bug Report, Feature Idea, General Feedback |
| Title | Text input | Yes | Short summary, max 120 chars |
| Description | Textarea | Yes | What happened / what you'd like / your thoughts |
| Screenshots | File upload (multi) | No | Accepts PNG, JPG, GIF, WEBP. Max 5 files, max 5MB each. Uploaded to Google Drive. |
| Severity (bugs only) | Single-select chips | Yes (if bug) | Blocking, Annoying, Minor |
| Page / feature | Single-select dropdown | No | Auto-populated list of app pages/features for context |

### File Upload via Google Drive

**Why not Supabase Storage:** Supabase free tier has limited storage (1GB). Screenshot uploads from broad beta testers could exhaust this quickly. Google Drive provides 15GB free and is easy to browse manually.

**Architecture:**

- **Supabase Edge Function** acts as the upload proxy
- Edge function authenticates with Google Drive API using a **service account**
- Service account has write access to a shared Google Drive folder owned by you
- Flow:
  1. User selects screenshots in the form
  2. Client uploads files to Supabase Edge Function endpoint (`/functions/v1/upload-screenshot`)
  3. Edge function validates file type and size
  4. Edge function uploads to Google Drive folder, organized as `/{report_id}/{filename}`
  5. Edge function returns the Google Drive file IDs
  6. File IDs are stored in the report metadata in Supabase

**Folder structure in Google Drive:**
```
Book of Tricks Beta Reports/
├── bug-2026-03-27-abc123/
│   ├── screenshot1.png
│   └── screenshot2.png
├── idea-2026-03-28-def456/
│   └── mockup.jpg
```

**Service account setup:**
1. Create a Google Cloud project (free)
2. Enable Google Drive API
3. Create a service account and download credentials JSON
4. Share the target Drive folder with the service account email
5. Store credentials as Supabase Edge Function secrets

### Data Model

**Table: `bug_reports`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `type` | text | 'bug', 'feature', 'feedback' |
| `title` | text | |
| `description` | text | |
| `severity` | text | Nullable, only for bugs |
| `page` | text | Nullable, which page/feature |
| `screenshot_ids` | jsonb | Array of Google Drive file IDs |
| `status` | text | 'new', 'seen', 'resolved' — for your own tracking |
| `created_at` | timestamptz | |

- RLS: Users can insert and read their own reports. You (admin) can read all.

### Confirmation

After submitting, show a brief confirmation: "Report filed — thanks for helping us improve." with a "File another" button.

---

## Shared Concerns

### Sidebar Integration

Both pages get sidebar entries in a "Beta" section:
- "Give Feedback" → `/feedback`
- "Report Bug / Idea" → `/report`

This section can be removed or renamed post-beta.

### Visual Design

Both pages follow the existing app aesthetic:
- Dark charcoal background, warm gold accents
- Cinzel headings, Crimson Pro body text
- Chip-select inputs match the tag/pill patterns used elsewhere in the app
- Progress bar uses the gold gradient from design tokens
- Form cards use the same border-radius and shadow patterns as existing content cards

### Mobile

- Wizard steps stack vertically, chips wrap naturally
- Bug reporter is a single scrollable form — straightforward on mobile
- File upload uses native file picker on mobile (camera option available)
