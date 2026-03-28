# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public marketing landing page with animated feature demos, individual feature routes, and SEO meta tags that showcases the GM Book of Tricks toolkit to Game Masters.

**Architecture:** New `src/features/landing/` feature folder with a single-scroll landing page composed of section components (nav, hero, trust strip, feature showcase, more features grid, final CTA, footer). Five animated demo components simulate app features using motion/react primitives. Individual `/features/:slug` routes reuse demo components. Router updated to serve landing page at `/`, login moved to `/login`.

**Tech Stack:** React 19, TanStack Router (hash history), Tailwind CSS 4 (existing `@theme` tokens), motion/react, react-icons (Gi set), Intersection Observer API (native).

**Spec:** `docs/superpowers/specs/2026-03-28-landing-page-design.md`

---

## File Structure

```
src/features/landing/
├── LandingPage.tsx           # Main scroll page — assembles all sections
├── FeaturePage.tsx            # Individual /features/:slug route page
├── feature-data.ts            # Feature metadata (titles, descriptions, slugs, icons, SEO)
├── useScrollAnimation.ts      # Intersection Observer hook for scroll-triggered visibility
├── components/
│   ├── LandingNav.tsx         # Sticky nav bar (transparent → opaque on scroll)
│   ├── HeroSection.tsx        # Split hero: copy left, demo right
│   ├── TrustStrip.tsx         # Thin social proof bar
│   ├── FeatureShowcase.tsx    # Maps over showcase features, renders FeatureRow per item
│   ├── FeatureRow.tsx         # Single alternating row: copy + demo
│   ├── MoreFeaturesGrid.tsx   # 3-col grid of non-showcase features
│   ├── FinalCTA.tsx           # Closing pitch + sign-up button
│   └── LandingFooter.tsx      # Minimal footer
├── demos/
│   ├── DemoFrame.tsx          # Shared app-window chrome (traffic lights + border)
│   ├── TimelineDemo.tsx       # Session timeline animation
│   ├── InitiativeDemo.tsx     # Combat tracker animation
│   ├── SpellbookDemo.tsx      # Spell search + filter animation
│   ├── GeneratorsDemo.tsx     # NPC generation animation
│   └── WebClipperDemo.tsx     # Browser clip animation
```

**Modified files:**
- `src/routes/router.tsx` — new routes, login path change
- `app/index.html` — SEO meta tags

---

## Task 1: Feature Data & Scroll Animation Hook

**Files:**
- Create: `src/features/landing/feature-data.ts`
- Create: `src/features/landing/useScrollAnimation.ts`

These are the shared data and utilities that all other components depend on.

- [ ] **Step 1: Create feature-data.ts**

```typescript
// src/features/landing/feature-data.ts
import {
  GiScrollUnfurled,
  GiCrossedSwords,
  GiSparkles,
  GiHoodedFigure,
  GiPuzzle,
  GiSpikedDragonHead,
  GiThreeFriends,
  GiPositionMarker,
  GiMagnifyingGlass,
  GiBookPile,
  GiNotebook,
  GiRollingDices,
  GiCastle,
} from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'

export interface ShowcaseFeature {
  slug: string
  category: string
  title: string
  shortDescription: string
  longDescription: string
  icon: IconComponent
  seoTitle: string
  seoDescription: string
}

export interface GridFeature {
  title: string
  description: string
  icon: IconComponent
}

export const showcaseFeatures: ShowcaseFeature[] = [
  {
    slug: 'session-timeline',
    category: 'SESSION PREP',
    title: 'Session Timeline',
    shortDescription:
      'Organize scenes, battles, NPCs, and notes into a living timeline. Drag to reorder on the fly. Everything at your fingertips mid-session.',
    longDescription:
      'The session timeline is the heart of your prep workflow. Build your session as a sequence of scenes — each one can hold markdown notes, monster stat blocks, NPC details, spell references, and full initiative tracker battles. Drag blocks to reorder when plans change. Switch from Prep to Play mode and run your session from the same view. Every piece of content you need is one click away, organized exactly the way you planned it.',
    icon: GiScrollUnfurled,
    seoTitle: 'Session Timeline | GM Book of Tricks',
    seoDescription:
      'Organize your D&D sessions with a drag-and-drop timeline. Scenes, battles, NPCs, and notes in one place. Free GM session prep tool.',
  },
  {
    slug: 'initiative-tracker',
    category: 'IN-PLAY',
    title: 'Initiative Tracker',
    shortDescription:
      'Real-time combat management with HP tracking, D&D 5e conditions, and turn order. Share with players via live sync.',
    longDescription:
      'Run combat without the spreadsheet. Add combatants with one click, roll initiative, and track HP, conditions, and turn order in real time. The tracker supports all D&D 5e conditions with visual indicators, quick-add panels for monsters from your bestiary, and automatic turn advancement. Built-in real-time sync means your players can follow along on their own devices.',
    icon: GiCrossedSwords,
    seoTitle: 'Initiative Tracker | GM Book of Tricks',
    seoDescription:
      'Free D&D initiative tracker with HP tracking, conditions, and real-time player sync. Run combat encounters smoothly.',
  },
  {
    slug: 'spellbook',
    category: 'REFERENCE',
    title: 'Spellbook',
    shortDescription:
      'Search the full D&D 5e spell list. Filter by level, school, or class. Import spells to your campaign and assign to characters.',
    longDescription:
      'Access the complete D&D 5e spell database with instant search and powerful filters. Narrow down by spell level, school of magic, or casting class. Import the spells your campaign actually uses into your personal spellbook for quick reference. Assign spells to player characters and NPCs so you always know who can cast what. Full spell details including components, duration, and description at a glance.',
    icon: GiSparkles,
    seoTitle: 'D&D 5e Spellbook | GM Book of Tricks',
    seoDescription:
      'Search and filter the complete D&D 5e spell list. Filter by level, school, and class. Import spells to your campaign. Free GM tool.',
  },
  {
    slug: 'generators',
    category: 'GENERATORS',
    title: 'NPC & Encounter Generators',
    shortDescription:
      'Random NPCs with personality, balanced encounters for any party level, and loot tables on demand. Never be caught unprepared.',
    longDescription:
      'When your players go off-script, the generators have your back. Create fully-formed NPCs with names, personalities, motivations, and appearance in one click. Build balanced encounters by selecting monsters and seeing the difficulty calculated for your party size and level. Roll on loot tables for treasure hoards and individual rewards. Every generated result can be saved directly to your campaign for future use.',
    icon: GiHoodedFigure,
    seoTitle: 'D&D NPC & Encounter Generator | GM Book of Tricks',
    seoDescription:
      'Generate random D&D NPCs, balanced encounters, and loot tables instantly. Free generator tools for Game Masters.',
  },
  {
    slug: 'web-clipper',
    category: 'UTILITY',
    title: 'Web Clipper',
    shortDescription:
      'Found a great monster stat block or map online? Clip it straight to your campaign with our browser extension. Your inspiration board fills itself.',
    longDescription:
      'The Web Clipper Chrome extension lets you capture content from anywhere on the web and send it directly to your campaign. Found a great homebrew monster on Reddit? A beautiful battle map on Pinterest? A rules clarification on a forum? Clip it with one click. Content lands in your Inspiration Board, organized and ready to drag into your next session timeline. Supports text, images, links, and full page clips.',
    icon: GiPuzzle,
    seoTitle: 'Web Clipper for D&D | GM Book of Tricks',
    seoDescription:
      'Clip D&D content from any website straight to your campaign. Chrome extension for Game Masters. Free browser extension.',
  },
]

export const gridFeatures: GridFeature[] = [
  {
    title: 'Bestiary',
    description: 'Search and import monsters with full stat blocks',
    icon: GiSpikedDragonHead,
  },
  {
    title: 'Characters',
    description: 'Manage PCs with ability scores and spell lists',
    icon: GiThreeFriends,
  },
  {
    title: 'Locations',
    description: 'Track towns, dungeons, and points of interest',
    icon: GiPositionMarker,
  },
  {
    title: 'Quick Reference',
    description: 'Rules and conditions at your fingertips',
    icon: GiMagnifyingGlass,
  },
  {
    title: "DM's Cheat Sheet",
    description: 'DCs, tables, and common rules in one place',
    icon: GiBookPile,
  },
  {
    title: 'Inspiration Board',
    description: 'Capture ideas, clips, and notes between sessions',
    icon: GiNotebook,
  },
  {
    title: 'Dice Roller',
    description: '3D dice with custom roll expressions',
    icon: GiRollingDices,
  },
  {
    title: 'Campaign Dashboard',
    description: 'Manage multiple campaigns from one place',
    icon: GiCastle,
  },
]
```

- [ ] **Step 2: Create useScrollAnimation.ts**

```typescript
// src/features/landing/useScrollAnimation.ts
import { useEffect, useRef, useState } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useScrollAnimation({
  threshold = 0.2,
  rootMargin = '0px',
  once = true,
}: UseScrollAnimationOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(element)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, isVisible }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/features/landing/feature-data.ts src/features/landing/useScrollAnimation.ts
git commit -m "feat(landing): add feature data and scroll animation hook"
```

---

## Task 2: DemoFrame & Demo Components

**Files:**
- Create: `src/features/landing/demos/DemoFrame.tsx`
- Create: `src/features/landing/demos/TimelineDemo.tsx`
- Create: `src/features/landing/demos/InitiativeDemo.tsx`
- Create: `src/features/landing/demos/SpellbookDemo.tsx`
- Create: `src/features/landing/demos/GeneratorsDemo.tsx`
- Create: `src/features/landing/demos/WebClipperDemo.tsx`

- [ ] **Step 1: Create DemoFrame.tsx**

The shared app-window chrome that wraps every demo.

```tsx
// src/features/landing/demos/DemoFrame.tsx
import type { ReactNode } from 'react'

interface DemoFrameProps {
  children: ReactNode
  className?: string
}

export function DemoFrame({ children, className = '' }: DemoFrameProps) {
  return (
    <div
      className={`bg-bg-base/50 border border-border rounded-[--radius-lg] overflow-hidden shadow-lg ${className}`}
    >
      {/* Traffic light dots */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-bg-deep/80 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
        <span className="ml-2 text-xs text-text-muted font-[family-name:--font-mono]">
          GM Book of Tricks
        </span>
      </div>
      {/* Demo content */}
      <div className="p-4 min-h-[240px] relative overflow-hidden">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create TimelineDemo.tsx**

```tsx
// src/features/landing/demos/TimelineDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const scenes = [
  { label: 'Scene', title: 'Arrival at Thornwall', color: 'bg-primary/20 border-primary/30' },
  { label: 'Battle', title: 'Ambush at the Bridge', color: 'bg-danger/20 border-danger/30' },
  { label: 'NPC', title: 'Meeting Aldric the Sage', color: 'bg-info/20 border-info/30' },
  { label: 'Scene', title: 'The Hidden Library', color: 'bg-primary/20 border-primary/30' },
]

export function TimelineDemo({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []

    scenes.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 600 + i * 800))
    })
    // Reorder animation: swap items 1 and 2
    timers.push(setTimeout(() => setStep(5), 600 + scenes.length * 800 + 1000))
    // Reset and loop
    timers.push(
      setTimeout(() => setStep(0), 600 + scenes.length * 800 + 3000)
    )
    const loop = setInterval(() => {
      setStep(0)
      scenes.forEach((_, i) => {
        timers.push(setTimeout(() => setStep(i + 1), 600 + i * 800))
      })
      timers.push(setTimeout(() => setStep(5), 600 + scenes.length * 800 + 1000))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  const visibleScenes = scenes.slice(0, Math.min(step, scenes.length))
  // When step is 5, swap indices 1 and 2 to simulate drag
  const displayScenes = step >= 5
    ? [visibleScenes[0], visibleScenes[2], visibleScenes[1], visibleScenes[3]].filter(Boolean)
    : visibleScenes

  return (
    <DemoFrame>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            SESSION 4 — TIMELINE
          </span>
          <span className="text-[10px] text-text-muted/60 font-[family-name:--font-mono]">
            PREP MODE
          </span>
        </div>
        <AnimatePresence mode="popLayout">
          {displayScenes.map((scene, i) => (
            <motion.div
              key={scene.title}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-3 p-2.5 rounded-[--radius-md] border ${scene.color}`}
            >
              <span className="text-[10px] font-[family-name:--font-label] text-text-muted tracking-wider w-10">
                {scene.label.toUpperCase()}
              </span>
              <span className="text-sm text-text-heading font-[family-name:--font-heading]">
                {scene.title}
              </span>
              <span className="ml-auto text-text-muted/40 text-xs">⋮⋮</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
```

- [ ] **Step 3: Create InitiativeDemo.tsx**

```tsx
// src/features/landing/demos/InitiativeDemo.tsx
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const combatants = [
  { name: 'Alaric (Fighter)', initiative: 19, hp: 45, maxHp: 45, isPlayer: true },
  { name: 'Goblin Archer', initiative: 15, hp: 11, maxHp: 11, isPlayer: false },
  { name: 'Miriel (Cleric)', initiative: 12, hp: 38, maxHp: 38, isPlayer: true },
  { name: 'Bugbear Chief', initiative: 8, hp: 27, maxHp: 27, isPlayer: false },
]

export function InitiativeDemo({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    // Reveal combatants one by one
    combatants.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 400 + i * 500))
    })
    // HP damage on goblin
    timers.push(setTimeout(() => setStep(5), 400 + combatants.length * 500 + 800))
    // Add condition
    timers.push(setTimeout(() => setStep(6), 400 + combatants.length * 500 + 1800))
    // Advance turn
    timers.push(setTimeout(() => setStep(7), 400 + combatants.length * 500 + 2800))
    // Loop
    const loop = setInterval(() => {
      setStep(0)
      combatants.forEach((_, i) => {
        timers.push(setTimeout(() => setStep(i + 1), 400 + i * 500))
      })
      timers.push(setTimeout(() => setStep(5), 400 + combatants.length * 500 + 800))
      timers.push(setTimeout(() => setStep(6), 400 + combatants.length * 500 + 1800))
      timers.push(setTimeout(() => setStep(7), 400 + combatants.length * 500 + 2800))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  const shown = combatants.slice(0, Math.min(step, combatants.length))
  const activeTurn = step >= 7 ? 1 : 0

  return (
    <DemoFrame>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            INITIATIVE — ROUND 1
          </span>
        </div>
        {shown.map((c, i) => {
          const hpLost = step >= 5 && i === 1
          const hasCondition = step >= 6 && i === 1
          const currentHp = hpLost ? 4 : c.hp
          const hpPercent = (currentHp / c.maxHp) * 100

          return (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-2 p-2 rounded-[--radius-sm] border ${
                i === activeTurn
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-bg-raised/50'
              }`}
            >
              <span className="text-xs font-[family-name:--font-mono] text-text-muted w-5 text-center">
                {c.initiative}
              </span>
              <span
                className={`text-sm flex-1 ${
                  c.isPlayer
                    ? 'text-text-heading font-[family-name:--font-heading]'
                    : 'text-danger font-[family-name:--font-heading]'
                }`}
              >
                {c.name}
              </span>
              {hasCondition && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30"
                >
                  Prone
                </motion.span>
              )}
              <div className="w-16 flex items-center gap-1">
                <div className="flex-1 h-1.5 rounded-full bg-bg-deep overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${hpPercent > 50 ? 'bg-success' : hpPercent > 25 ? 'bg-warning' : 'bg-danger'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-[10px] font-[family-name:--font-mono] text-text-muted w-8 text-right">
                  {currentHp}/{c.maxHp}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </DemoFrame>
  )
}
```

- [ ] **Step 4: Create SpellbookDemo.tsx**

```tsx
// src/features/landing/demos/SpellbookDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const allSpells = [
  { name: 'Fireball', level: 3, school: 'Evocation', match: true },
  { name: 'Fire Bolt', level: 0, school: 'Evocation', match: true },
  { name: 'Fire Shield', level: 4, school: 'Evocation', match: true },
  { name: 'Fire Storm', level: 7, school: 'Evocation', match: true },
]

const searchText = 'fire'

export function SpellbookDemo({ isVisible }: { isVisible: boolean }) {
  const [typedChars, setTypedChars] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [expandedSpell, setExpandedSpell] = useState(-1)

  useEffect(() => {
    if (!isVisible) return
    setTypedChars(0)
    setShowResults(false)
    setExpandedSpell(-1)

    const timers: ReturnType<typeof setTimeout>[] = []

    // Type search characters
    searchText.split('').forEach((_, i) => {
      timers.push(setTimeout(() => setTypedChars(i + 1), 800 + i * 200))
    })
    // Show results
    timers.push(setTimeout(() => setShowResults(true), 800 + searchText.length * 200 + 400))
    // Expand first spell
    timers.push(setTimeout(() => setExpandedSpell(0), 800 + searchText.length * 200 + 1800))
    // Loop
    const loop = setInterval(() => {
      setTypedChars(0)
      setShowResults(false)
      setExpandedSpell(-1)
      searchText.split('').forEach((_, i) => {
        timers.push(setTimeout(() => setTypedChars(i + 1), 800 + i * 200))
      })
      timers.push(setTimeout(() => setShowResults(true), 800 + searchText.length * 200 + 400))
      timers.push(setTimeout(() => setExpandedSpell(0), 800 + searchText.length * 200 + 1800))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  return (
    <DemoFrame>
      <div>
        {/* Search input */}
        <div className="flex items-center gap-2 p-2 rounded-[--radius-md] border border-border bg-bg-surface/50 mb-3">
          <span className="text-text-muted text-sm">⌕</span>
          <span className="text-sm text-text-body font-[family-name:--font-body]">
            {searchText.slice(0, typedChars)}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-px h-4 bg-primary ml-px align-middle"
            />
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 mb-3">
          {['All Levels', 'Evocation', 'Wizard'].map((chip, i) => (
            <span
              key={chip}
              className={`text-[10px] px-2 py-1 rounded-full border ${
                i > 0
                  ? 'border-primary/30 bg-primary/10 text-primary-light'
                  : 'border-border text-text-muted'
              }`}
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Results */}
        <AnimatePresence>
          {showResults && (
            <div className="space-y-1.5">
              {allSpells.map((spell, i) => (
                <motion.div
                  key={spell.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.08 }}
                >
                  <div
                    className={`p-2 rounded-[--radius-sm] border ${
                      expandedSpell === i
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-bg-raised/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-heading font-[family-name:--font-heading]">
                        {spell.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">{spell.school}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-deep text-text-secondary font-[family-name:--font-mono]">
                          Lvl {spell.level}
                        </span>
                      </div>
                    </div>
                    {expandedSpell === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 pt-2 border-t border-border"
                      >
                        <p className="text-xs text-text-secondary leading-relaxed">
                          A bright streak flashes from your pointing finger to a point you choose
                          within range and then blossoms with a low roar into an explosion of flame.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
```

- [ ] **Step 5: Create GeneratorsDemo.tsx**

```tsx
// src/features/landing/demos/GeneratorsDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

const npcResult = {
  name: 'Brenna Ashworth',
  race: 'Half-Elf',
  occupation: 'Traveling Herbalist',
  trait: 'Speaks in riddles when nervous',
  motivation: 'Searching for a rare cure',
  appearance: 'Silver-streaked hair, ink-stained fingers',
}

const fields = Object.entries(npcResult) as [string, string][]

export function GeneratorsDemo({ isVisible }: { isVisible: boolean }) {
  const [showButton, setShowButton] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revealedFields, setRevealedFields] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    setShowButton(true)
    setGenerating(false)
    setRevealedFields(0)

    const timers: ReturnType<typeof setTimeout>[] = []

    // Press generate
    timers.push(setTimeout(() => { setShowButton(false); setGenerating(true) }, 1200))
    // Stop generating, start revealing fields
    timers.push(setTimeout(() => setGenerating(false), 1800))
    fields.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedFields(i + 1), 2000 + i * 400))
    })
    // Loop
    const loop = setInterval(() => {
      setShowButton(true)
      setGenerating(false)
      setRevealedFields(0)
      timers.push(setTimeout(() => { setShowButton(false); setGenerating(true) }, 1200))
      timers.push(setTimeout(() => setGenerating(false), 1800))
      fields.forEach((_, i) => {
        timers.push(setTimeout(() => setRevealedFields(i + 1), 2000 + i * 400))
      })
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  return (
    <DemoFrame>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-[family-name:--font-label] text-text-muted tracking-wider">
            NPC GENERATOR
          </span>
        </div>

        {showButton && (
          <motion.div
            className="flex justify-center py-8"
            animate={{ scale: [1, 0.97, 1] }}
            transition={{ duration: 0.3, delay: 1.0 }}
          >
            <div className="px-5 py-2.5 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold">
              Generate NPC
            </div>
          </motion.div>
        )}

        {generating && (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
            />
          </div>
        )}

        <AnimatePresence>
          {!showButton && !generating && (
            <div className="space-y-2">
              {fields.slice(0, revealedFields).map(([key, value], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2"
                >
                  <span className="text-[10px] font-[family-name:--font-label] text-text-muted tracking-wider w-20 pt-0.5 text-right shrink-0">
                    {key.toUpperCase()}
                  </span>
                  <span className="text-sm text-text-body">{value}</span>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
```

- [ ] **Step 6: Create WebClipperDemo.tsx**

```tsx
// src/features/landing/demos/WebClipperDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

export function WebClipperDemo({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0)
  // 0: show browser content, 1: show clipper icon, 2: clip animation, 3: show inbox

  useEffect(() => {
    if (!isVisible) return
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => setStep(1), 1200))
    timers.push(setTimeout(() => setStep(2), 2400))
    timers.push(setTimeout(() => setStep(3), 3400))

    const loop = setInterval(() => {
      setStep(0)
      timers.push(setTimeout(() => setStep(1), 1200))
      timers.push(setTimeout(() => setStep(2), 2400))
      timers.push(setTimeout(() => setStep(3), 3400))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  return (
    <DemoFrame>
      <div className="relative">
        {/* Mock browser tab */}
        <div className="rounded-[--radius-sm] border border-border bg-bg-raised/50 mb-3 overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-deep/60 border-b border-border">
            <span className="text-[10px] text-text-muted font-[family-name:--font-mono] truncate">
              reddit.com/r/dndnext/homebrew_monsters
            </span>
            <AnimatePresence>
              {step >= 1 && step < 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="ml-auto shrink-0 w-5 h-5 rounded bg-primary/20 border border-primary/30 flex items-center justify-center"
                >
                  <span className="text-[10px] text-primary">✂</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {step < 3 && (
              <motion.div
                className="p-3"
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs text-text-heading font-[family-name:--font-heading] mb-1">
                  Shadow Drake (CR 4)
                </div>
                <div className="text-[11px] text-text-secondary leading-relaxed mb-2">
                  Medium dragon, neutral evil. A sleek, bat-winged drake that dissolves into shadow
                  when threatened...
                </div>
                <div className="flex gap-3 text-[10px] text-text-muted font-[family-name:--font-mono]">
                  <span>AC 15</span>
                  <span>HP 52</span>
                  <span>Speed 40ft, fly 60ft</span>
                </div>

                {/* Clip highlight effect */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-primary/10 rounded-[--radius-sm] pointer-events-none"
                    style={{ top: '28px' }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Campaign inbox */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-[10px] font-[family-name:--font-label] text-text-muted tracking-wider mb-2">
                INSPIRATION BOARD
              </div>
              <div className="p-2.5 rounded-[--radius-sm] border border-success/30 bg-success/5">
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <span className="text-[10px] text-success">✓</span>
                  </motion.div>
                  <div>
                    <div className="text-xs text-text-heading font-[family-name:--font-heading]">
                      Shadow Drake (CR 4)
                    </div>
                    <div className="text-[10px] text-text-muted">Clipped from reddit.com</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No errors related to the demo files.

- [ ] **Step 8: Commit**

```bash
git add src/features/landing/demos/
git commit -m "feat(landing): add demo frame and 5 animated demo components"
```

---

## Task 3: Landing Page Section Components

**Files:**
- Create: `src/features/landing/components/LandingNav.tsx`
- Create: `src/features/landing/components/HeroSection.tsx`
- Create: `src/features/landing/components/TrustStrip.tsx`
- Create: `src/features/landing/components/FeatureRow.tsx`
- Create: `src/features/landing/components/FeatureShowcase.tsx`
- Create: `src/features/landing/components/MoreFeaturesGrid.tsx`
- Create: `src/features/landing/components/FinalCTA.tsx`
- Create: `src/features/landing/components/LandingFooter.tsx`

- [ ] **Step 1: Create LandingNav.tsx**

```tsx
// src/features/landing/components/LandingNav.tsx
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-[--duration-slow] ${
        scrolled ? 'bg-bg-deep/95 backdrop-blur-sm border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <span className="font-[family-name:--font-display] text-lg gold-foil">
          GM Book of Tricks
        </span>
        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-text-secondary hover:text-text-body transition-colors hidden sm:block"
          >
            Features
          </a>
          <Link
            to="/login"
            className="px-4 py-1.5 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold hover:brightness-110 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create HeroSection.tsx**

```tsx
// src/features/landing/components/HeroSection.tsx
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { showcaseFeatures } from '../feature-data'
import { TimelineDemo } from '../demos/TimelineDemo'
import { InitiativeDemo } from '../demos/InitiativeDemo'
import { SpellbookDemo } from '../demos/SpellbookDemo'
import { GeneratorsDemo } from '../demos/GeneratorsDemo'
import { WebClipperDemo } from '../demos/WebClipperDemo'

const demos = [TimelineDemo, InitiativeDemo, SpellbookDemo, GeneratorsDemo, WebClipperDemo]

export function HeroSection() {
  const [activeDemoIndex, setActiveDemoIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDemoIndex((prev) => (prev + 1) % demos.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const ActiveDemo = demos[activeDemoIndex]

  return (
    <section className="min-h-dvh flex items-center pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: Copy */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-[family-name:--font-label] text-xs tracking-[0.2em] text-text-muted mb-4">
              FORGED FOR GAME MASTERS
            </p>
            <h1 className="font-[family-name:--font-display] text-4xl sm:text-5xl gold-foil mb-4 leading-tight">
              GM Book of Tricks
            </h1>
            <p className="font-[family-name:--font-body] text-lg text-text-secondary max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
              Session prep, initiative tracking, and in-play reference — so you
              can focus on the story, not the bookkeeping.
            </p>
            <div className="flex gap-3 justify-center lg:justify-start">
              <Link
                to="/login"
                className="px-6 py-3 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold hover:brightness-110 transition-all"
              >
                Start Your Campaign
              </Link>
              <a
                href="#features"
                className="px-6 py-3 rounded-[--radius-md] border border-primary/30 text-primary-light font-[family-name:--font-heading] text-sm hover:bg-primary/5 transition-colors"
              >
                See Features
              </a>
            </div>
          </motion.div>

          {/* Right: Demo */}
          <motion.div
            className="flex-1 w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <ActiveDemo isVisible={true} />
            {/* Demo indicator dots */}
            <div className="flex justify-center gap-2 mt-4">
              {showcaseFeatures.map((f, i) => (
                <button
                  key={f.slug}
                  onClick={() => setActiveDemoIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                    i === activeDemoIndex ? 'bg-primary' : 'bg-text-muted/30'
                  }`}
                  aria-label={`Show ${f.title} demo`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create TrustStrip.tsx**

```tsx
// src/features/landing/components/TrustStrip.tsx
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'

export function TrustStrip() {
  return (
    <section className="py-8">
      <OrnamentalDivider opacity={0.2} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-text-muted">
          <span className="font-[family-name:--font-label] text-xs tracking-wider">
            FREE DURING BETA
          </span>
          <span className="hidden sm:block text-text-muted/30">·</span>
          <span className="font-[family-name:--font-label] text-xs tracking-wider">
            BUILT BY A GM, FOR GMs
          </span>
          <span className="hidden sm:block text-text-muted/30">·</span>
          <span className="font-[family-name:--font-label] text-xs tracking-wider">
            D&D 5E & SYSTEM-AGNOSTIC
          </span>
        </div>
      </div>
      <OrnamentalDivider opacity={0.2} />
    </section>
  )
}
```

- [ ] **Step 4: Create FeatureRow.tsx**

```tsx
// src/features/landing/components/FeatureRow.tsx
import { forwardRef } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import type { ShowcaseFeature } from '../feature-data'

interface FeatureRowProps {
  feature: ShowcaseFeature
  demo: React.ReactNode
  reversed: boolean
  isVisible: boolean
}

export const FeatureRow = forwardRef<HTMLDivElement, FeatureRowProps>(
  function FeatureRow({ feature, demo, reversed, isVisible }, ref) {

  const copy = (
    <div className="flex-1">
      <p className="font-[family-name:--font-label] text-xs tracking-[0.15em] text-primary mb-2">
        {feature.category}
      </p>
      <h3 className="font-[family-name:--font-heading] text-2xl text-text-heading mb-3">
        {feature.title}
      </h3>
      <p className="font-[family-name:--font-body] text-text-secondary leading-relaxed mb-4">
        {feature.shortDescription}
      </p>
      <Link
        to="/features/$slug"
        params={{ slug: feature.slug }}
        className="text-primary-light font-[family-name:--font-heading] text-sm hover:underline"
      >
        Learn more →
      </Link>
    </div>
  )

  const demoEl = <div className="flex-1 w-full">{demo}</div>

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="py-12 lg:py-16"
    >
      <div
        className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-12 ${
          reversed ? 'lg:flex-row-reverse' : ''
        }`}
      >
        {/* On mobile, always show copy first */}
        <div className="flex-1 order-1 lg:order-none">{copy}</div>
        <div className="flex-1 w-full order-2 lg:order-none">{demoEl}</div>
      </div>
    </motion.div>
  )
}
)
```

Note: `FeatureRow` uses `forwardRef` so the parent `ShowcaseRow` can attach the Intersection Observer ref. The `isVisible` prop is passed down from the parent which owns the single observer. On mobile, `order-1`/`order-2` ensures copy-first; on desktop, `lg:order-none` + `lg:flex-row-reverse` handles alternating layout.

- [ ] **Step 5: Create FeatureShowcase.tsx**

```tsx
// src/features/landing/components/FeatureShowcase.tsx
import { showcaseFeatures } from '../feature-data'
import { FeatureRow } from './FeatureRow'
import { TimelineDemo } from '../demos/TimelineDemo'
import { InitiativeDemo } from '../demos/InitiativeDemo'
import { SpellbookDemo } from '../demos/SpellbookDemo'
import { GeneratorsDemo } from '../demos/GeneratorsDemo'
import { WebClipperDemo } from '../demos/WebClipperDemo'
import { useScrollAnimation } from '../useScrollAnimation'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'

const demoComponents = [TimelineDemo, InitiativeDemo, SpellbookDemo, GeneratorsDemo, WebClipperDemo]

function ShowcaseRow({ index }: { index: number }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, once: false })
  const feature = showcaseFeatures[index]
  const DemoComponent = demoComponents[index]

  return (
    <FeatureRow
      ref={ref}
      feature={feature}
      demo={<DemoComponent isVisible={isVisible} />}
      reversed={index % 2 === 1}
      isVisible={isVisible}
    />
  )
}

export function FeatureShowcase() {
  return (
    <section id="features" className="py-12 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {showcaseFeatures.map((_, index) => (
          <div key={showcaseFeatures[index].slug}>
            <ShowcaseRow index={index} />
            {index < showcaseFeatures.length - 1 && <OrnamentalDivider opacity={0.15} />}
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Create MoreFeaturesGrid.tsx**

```tsx
// src/features/landing/components/MoreFeaturesGrid.tsx
import { motion } from 'motion/react'
import { gridFeatures } from '../feature-data'
import { useScrollAnimation } from '../useScrollAnimation'

export function MoreFeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })

  return (
    <section className="py-12 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="font-[family-name:--font-heading] text-2xl text-text-heading text-center mb-10">
          And there's more...
        </h2>
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {gridFeatures.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="p-4 rounded-[--radius-md] border border-border bg-bg-base/30 hover:border-primary/20 hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className="text-primary/60 group-hover:text-primary transition-colors shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <h3 className="font-[family-name:--font-heading] text-sm text-text-heading mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Create FinalCTA.tsx**

```tsx
// src/features/landing/components/FinalCTA.tsx
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
import { useScrollAnimation } from '../useScrollAnimation'

export function FinalCTA() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 })

  return (
    <section className="py-20 lg:py-32">
      <OrnamentalDivider />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto px-4 sm:px-6 text-center py-16"
      >
        <h2 className="font-[family-name:--font-display] text-3xl sm:text-4xl gold-foil mb-4">
          Your next session starts here.
        </h2>
        <p className="font-[family-name:--font-body] text-text-secondary mb-8">
          Free during beta. No credit card required.
        </p>
        <Link
          to="/login"
          className="inline-block px-8 py-3.5 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-base font-semibold hover:brightness-110 transition-all"
        >
          Start Your Campaign
        </Link>
      </motion.div>
      <OrnamentalDivider />
    </section>
  )
}
```

- [ ] **Step 8: Create LandingFooter.tsx**

```tsx
// src/features/landing/components/LandingFooter.tsx
import { Link } from '@tanstack/react-router'
import { showcaseFeatures } from '../feature-data'

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-bg-deep/80 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">
          {/* Logo */}
          <div>
            <span className="font-[family-name:--font-display] text-lg gold-foil">
              GM Book of Tricks
            </span>
            <p className="text-xs text-text-muted mt-1">Made with ♥ by a GM</p>
          </div>

          {/* Feature links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {showcaseFeatures.map((f) => (
              <Link
                key={f.slug}
                to="/features/$slug"
                params={{ slug: f.slug }}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {f.title}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="text-xs text-text-muted/60 text-center sm:text-right">
            <p>© {new Date().getFullYear()} GM Book of Tricks</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No errors related to the landing components.

- [ ] **Step 10: Commit**

```bash
git add src/features/landing/components/
git commit -m "feat(landing): add all landing page section components"
```

---

## Task 4: LandingPage, FeaturePage & Router Integration

**Files:**
- Create: `src/features/landing/LandingPage.tsx`
- Create: `src/features/landing/FeaturePage.tsx`
- Modify: `src/routes/router.tsx`
- Modify: `app/index.html`

- [ ] **Step 1: Create LandingPage.tsx**

```tsx
// src/features/landing/LandingPage.tsx
import { LandingNav } from './components/LandingNav'
import { HeroSection } from './components/HeroSection'
import { TrustStrip } from './components/TrustStrip'
import { FeatureShowcase } from './components/FeatureShowcase'
import { MoreFeaturesGrid } from './components/MoreFeaturesGrid'
import { FinalCTA } from './components/FinalCTA'
import { LandingFooter } from './components/LandingFooter'
import { AmbientEmbers } from '@/components/ui/AmbientEmbers'

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg-deep relative">
      <AmbientEmbers />
      {/* Paper grain */}
      <div className="fixed inset-0 z-[59] pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" className="opacity-[0.025]">
          <filter id="landing-grain">
            <feTurbulence baseFrequency="0.9" numOctaves="4" />
          </filter>
          <rect width="100%" height="100%" filter="url(#landing-grain)" />
        </svg>
      </div>
      {/* Vignette */}
      <div
        className="fixed inset-0 z-[60] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, var(--color-bg-deep) 100%)',
        }}
      />
      <LandingNav />
      <HeroSection />
      <TrustStrip />
      <FeatureShowcase />
      <MoreFeaturesGrid />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
```

Note: The landing page renders its own atmosphere layers (paper grain, vignette, embers) because `App.tsx` renders these for the authenticated app — the landing page is a separate full-page experience that doesn't go through App.tsx's atmosphere wrappers (it's rendered directly by the router). Check whether App.tsx's atmosphere layers are in the root layout or conditional on auth — if they're always present in the root layout, remove the duplicates from LandingPage.

Actually, looking at App.tsx, the atmosphere overlays (paper grain, vignette, embers) are rendered unconditionally in `App.tsx` which wraps the `RouterProvider`. So the landing page will already have them. Remove the atmosphere layers from LandingPage:

```tsx
// src/features/landing/LandingPage.tsx — CORRECTED VERSION
import { LandingNav } from './components/LandingNav'
import { HeroSection } from './components/HeroSection'
import { TrustStrip } from './components/TrustStrip'
import { FeatureShowcase } from './components/FeatureShowcase'
import { MoreFeaturesGrid } from './components/MoreFeaturesGrid'
import { FinalCTA } from './components/FinalCTA'
import { LandingFooter } from './components/LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg-deep">
      <LandingNav />
      <HeroSection />
      <TrustStrip />
      <FeatureShowcase />
      <MoreFeaturesGrid />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
```

- [ ] **Step 2: Create FeaturePage.tsx**

```tsx
// src/features/landing/FeaturePage.tsx
import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { showcaseFeatures } from './feature-data'
import { LandingNav } from './components/LandingNav'
import { LandingFooter } from './components/LandingFooter'
import { TimelineDemo } from './demos/TimelineDemo'
import { InitiativeDemo } from './demos/InitiativeDemo'
import { SpellbookDemo } from './demos/SpellbookDemo'
import { GeneratorsDemo } from './demos/GeneratorsDemo'
import { WebClipperDemo } from './demos/WebClipperDemo'

const demoMap: Record<string, React.ComponentType<{ isVisible: boolean }>> = {
  'session-timeline': TimelineDemo,
  'initiative-tracker': InitiativeDemo,
  spellbook: SpellbookDemo,
  generators: GeneratorsDemo,
  'web-clipper': WebClipperDemo,
}

export function FeaturePage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const feature = showcaseFeatures.find((f) => f.slug === slug)

  useEffect(() => {
    if (feature) {
      document.title = feature.seoTitle
    }
    return () => {
      document.title = 'GM Book of Tricks'
    }
  }, [feature])

  if (!feature) {
    return (
      <div className="min-h-dvh bg-bg-deep flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-text-heading mb-4">Feature not found</h1>
          <Link to="/" className="text-primary hover:text-primary-light">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const DemoComponent = demoMap[feature.slug]

  return (
    <div className="min-h-dvh bg-bg-deep">
      <LandingNav />
      <div className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Back link */}
          <Link
            to="/"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-8 inline-block"
          >
            ← All Features
          </Link>

          {/* Feature content */}
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="font-[family-name:--font-label] text-xs tracking-[0.15em] text-primary mb-2">
                {feature.category}
              </p>
              <h1 className="font-[family-name:--font-heading] text-3xl sm:text-4xl text-text-heading mb-6">
                {feature.title}
              </h1>
              <div className="font-[family-name:--font-body] text-text-secondary leading-relaxed space-y-4">
                {feature.longDescription.split('. ').reduce<string[]>((acc, sentence, i, arr) => {
                  // Group sentences into paragraphs of ~2 sentences
                  const last = acc[acc.length - 1]
                  if (last && last.split('. ').length < 2) {
                    acc[acc.length - 1] = last + '. ' + sentence
                  } else {
                    acc.push(sentence)
                  }
                  return acc
                }, []).map((paragraph, i) => (
                  <p key={i}>{paragraph}{paragraph.endsWith('.') ? '' : '.'}</p>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="flex-1 w-full max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {DemoComponent && <DemoComponent isVisible={true} />}
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            className="text-center py-16 mt-12 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-[family-name:--font-heading] text-xl text-text-heading mb-3">
              Try {feature.title}
            </h2>
            <p className="text-text-muted mb-6">Free during beta. No credit card required.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-[--radius-md] bg-gradient-to-br from-primary to-primary-dim text-text-inverse font-[family-name:--font-heading] text-sm font-semibold hover:brightness-110 transition-all"
            >
              Start Your Campaign
            </Link>
          </motion.div>
        </div>
      </div>
      <LandingFooter />
    </div>
  )
}
```

- [ ] **Step 3: Update router.tsx**

Replace the current `loginRoute` at path `/` with the landing page at `/`, add a new `/login` route for the login page, and add the `/features/$slug` route.

Current file: `src/routes/router.tsx`

Add import at the top (after existing imports):

```typescript
import { LandingPage } from '@/features/landing/LandingPage'
import { FeaturePage } from '@/features/landing/FeaturePage'
```

Replace the `loginRoute` definition (lines 53-63):

```typescript
// Public: Landing page
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
  beforeLoad: () => {
    const { user, loading } = useAuth.getState()
    if (!loading && user) {
      throw redirect({ to: '/home' })
    }
  },
})

// Public: Login
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const { user, loading } = useAuth.getState()
    if (!loading && user) {
      throw redirect({ to: '/home' })
    }
  },
})

// Public: Feature pages
const featureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features/$slug',
  component: FeaturePage,
})
```

Update the route tree (line 222) to include the new routes:

```typescript
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  featureRoute,
  homeRoute,
  feedbackRoute,
  reportRoute,
  campaignRoute.addChildren([
    campaignOverviewRoute,
    charactersRoute,
    bestiaryRoute,
    spellbookRoute,
    locationsRoute,
    generatorsRoute,
    scratchpadRoute,
    sessionsRoute,
    sessionDetailRoute,
  ]),
])
```

Also update the protected routes to redirect to `/login` instead of `/` (since `/` is now the landing page, not login). Update every `throw redirect({ to: '/' })` to `throw redirect({ to: '/login' })` in: `homeRoute`, `feedbackRoute`, `reportRoute`, and `campaignRoute`.

- [ ] **Step 4: Update index.html with SEO meta tags**

Add meta description and Open Graph tags to `app/index.html` `<head>`:

```html
<meta name="description" content="Free GM toolkit for D&D 5e and tabletop RPGs. Session prep, initiative tracking, bestiary, spellbook, NPC generators, and in-play reference. Built by a GM, for GMs.">
<meta property="og:title" content="GM Book of Tricks — Session Prep Toolkit for Game Masters">
<meta property="og:description" content="Session prep, initiative tracking, and in-play reference — so you can focus on the story, not the bookkeeping.">
<meta property="og:type" content="website">
```

Insert these after the `<title>` tag (line 11).

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Run the dev server and manually verify**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npm run dev`

Verify:
1. `http://localhost:5173/#/` shows the landing page
2. `http://localhost:5173/#/login` shows the login page
3. `http://localhost:5173/#/features/session-timeline` shows the feature page
4. Animated demos play and loop
5. Navigation links work (Features anchor scrolls, Sign In goes to /login)
6. After logging in, visiting `/` redirects to `/home`
7. Mobile responsive: hero stacks, grid collapses

- [ ] **Step 7: Commit**

```bash
git add src/features/landing/LandingPage.tsx src/features/landing/FeaturePage.tsx src/routes/router.tsx index.html
git commit -m "feat(landing): add landing page, feature pages, and route integration"
```

---

## Task 5: Polish & Verification

**Files:**
- Modify: `src/features/landing/components/FeatureShowcase.tsx` (if demo visibility needs fixing)
- No new files

- [ ] **Step 1: Run TypeScript check**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 2: Run build**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual smoke test checklist**

Run dev server and verify each of these:

1. Landing page loads at `/#/` with no console errors
2. Hero section: gold foil title renders, demo auto-cycles, dots switch demos
3. Trust strip: text centered, ornamental dividers visible
4. Feature showcase: rows alternate layout, demos play when scrolled into view
5. More features grid: 3 columns on desktop, 2 on tablet viewport, 1 on mobile viewport
6. Final CTA: gold foil heading renders, button links to /login
7. Footer: logo, feature links, copyright all present
8. Navigation: "Features" scrolls to showcase, "Sign In" navigates to /login
9. Feature pages: each slug loads correct demo and content
10. Auth redirect: logged-in user at `/` goes to `/home`; logged-out user at `/home` goes to `/login`
11. Reduced motion: demo animations respect `prefers-reduced-motion`

- [ ] **Step 4: Fix any issues found in smoke test**

Address each issue found. Common things to check:
- Scroll animation hook not triggering (check threshold value)
- Demo timers not cleaning up (check useEffect cleanup)
- `gold-foil` class not applying (check it's in index.css)
- Mobile hamburger (deferred — nav just hides "Features" link on mobile via `hidden sm:block`, which is sufficient for now)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(landing): polish and fix landing page issues"
```

Only create this commit if there were actual changes to fix. If the smoke test passed clean, skip this commit.
