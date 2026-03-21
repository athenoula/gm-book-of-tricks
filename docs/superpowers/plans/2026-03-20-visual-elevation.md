# Visual Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fantasy-illustrated visual effects to the GM Book of Tricks — new fonts, gold foil headings, ornamental dividers, card corners, vignette, paper grain, floating embers, and torch flicker.

**Architecture:** All CSS-only effects applied via `index.css` utility classes and two small React components (`OrnamentalDivider`, `AmbientEmbers`). Global overlays (vignette, grain, embers) rendered as divs in `App.tsx`. No new npm dependencies.

**Tech Stack:** CSS custom properties, inline SVG, CSS keyframe animations, Google Fonts, Tailwind 4 @theme tokens.

**Spec:** `docs/superpowers/specs/2026-03-20-visual-elevation-design.md`

---

### Task 1: Font Stack — Google Fonts + Design Tokens

**Files:**
- Modify: `index.html:14` (Google Fonts link)
- Modify: `src/index.css:7-65` (@theme block)
- Modify: `src/index.css:77` (body font-family)
- Modify: `src/index.css:87-93` (heading styles)

- [ ] **Step 1: Replace Google Fonts link in index.html**

Replace line 14 of `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cinzel+Decorative:wght@400&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Spectral+SC:wght@400;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Add font tokens to @theme block in index.css**

Add these inside the existing `@theme { }` block, after the sidebar tokens:

```css
  /* Typography */
  --font-display: 'Cinzel Decorative', serif;
  --font-heading: 'Cinzel', serif;
  --font-body: 'Crimson Pro', Georgia, serif;
  --font-label: 'Spectral SC', serif;
  --font-mono: 'JetBrains Mono', monospace;
```

- [ ] **Step 3: Update body and heading font-family**

In `src/index.css`, change the body rule (line 77):
```css
font-family: var(--font-body);
```

Change the heading rule (lines 88-93):
```css
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    color: var(--color-text-heading);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.02em;
    margin: 0;
  }
```

- [ ] **Step 4: Audit for hardcoded old font names**

Run: `grep -r "DM.Sans\|Cormorant.Garamond" app/src/ --include="*.tsx" --include="*.ts" --include="*.css"`

This catches both `DM Sans` (spaces) and `DM_Sans` (Tailwind arbitrary value syntax). Expected: zero matches after fixes.

**Known hit:** `src/components/ui/Toast.tsx` line 32 has `font-[DM_Sans]`. Remove it — the body font-family now handles this:

```tsx
// Before:
className={`max-w-[360px] rounded-[--radius-md] shadow-md px-4 py-3 cursor-pointer flex items-center gap-2 font-[DM_Sans] text-[13px] ${styles[toast.type]}`}

// After:
className={`max-w-[360px] rounded-[--radius-md] shadow-md px-4 py-3 cursor-pointer flex items-center gap-2 text-[13px] ${styles[toast.type]}`}
```

- [ ] **Step 5: Verify fonts render in browser**

Run: `npm run dev` and open in browser. Check:
- Headings use Cinzel (serif, slightly engraved look)
- Body text uses Crimson Pro (old-style serif, readable)
- Stats/mono still JetBrains Mono

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: upgrade font stack to Cinzel + Crimson Pro + Spectral SC"
```

---

### Task 2: CSS Utility Classes — Gold Foil, Corners, Flicker

**Files:**
- Modify: `src/index.css` (add utility classes after the `@layer base` block)

- [ ] **Step 1: Add gold-foil, ornamental-corners, and torch-flicker classes**

Add after the `@media (prefers-reduced-motion)` block at the end of `index.css`:

```css
/* =============================================
   Visual Elevation — Utility Classes
   ============================================= */

/* Gold foil metallic text effect */
.gold-foil {
  background: linear-gradient(135deg, #a67c28 0%, #f5d78e 35%, #d4a24e 50%, #f5d78e 65%, #a67c28 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.gold-foil:hover {
  filter: drop-shadow(0 2px 4px rgba(166, 124, 40, 0.3));
}

/* Ornamental card corners */
.ornamental-corners {
  position: relative;
}
.ornamental-corners::before,
.ornamental-corners::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: rgba(245, 158, 11, 0.2);
  border-style: solid;
  transition: border-color var(--duration-normal);
  pointer-events: none;
}
.ornamental-corners::before {
  top: 4px;
  left: 4px;
  border-width: 2px 0 0 2px;
}
.ornamental-corners::after {
  bottom: 4px;
  right: 4px;
  border-width: 0 2px 2px 0;
}
.ornamental-corners:hover::before,
.ornamental-corners:hover::after {
  border-color: rgba(245, 158, 11, 0.5);
}

/* Torch flicker animation */
@keyframes flicker {
  0%, 100% { opacity: 1; filter: brightness(1); }
  5% { opacity: 0.96; filter: brightness(0.98); }
  15% { opacity: 0.97; }
  50% { opacity: 1; filter: brightness(1.02); }
  55% { opacity: 0.98; filter: brightness(0.97); }
}

.torch-flicker {
  animation: flicker 3s ease-in-out infinite;
}

/* Ember rise animation */
@keyframes ember-rise {
  0% { transform: translateY(100vh) scale(0); opacity: 0; }
  8% { opacity: 0.7; transform: translateY(90vh) scale(1); }
  50% { opacity: 0.4; transform: translateY(50vh) translateX(var(--drift)); }
  100% { transform: translateY(-5vh) translateX(var(--drift-end)) scale(0.3); opacity: 0; }
}

/* Reduced motion: hide embers, stop flicker */
@media (prefers-reduced-motion: reduce) {
  .ember { display: none; }
  .torch-flicker { animation: none; }
}
```

- [ ] **Step 2: Verify classes exist**

Open browser DevTools, add `gold-foil` class to any heading — confirm metallic gradient appears. Add `ornamental-corners` to any card — confirm gold corner accents.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add gold-foil, ornamental-corners, torch-flicker CSS utilities"
```

---

### Task 3: New Components — OrnamentalDivider + AmbientEmbers

**Files:**
- Create: `src/components/ui/OrnamentalDivider.tsx`
- Create: `src/components/ui/AmbientEmbers.tsx`

- [ ] **Step 1: Create OrnamentalDivider component**

Create `src/components/ui/OrnamentalDivider.tsx`:

```tsx
interface Props {
  className?: string
  opacity?: number
}

export function OrnamentalDivider({ className = '', opacity = 0.4 }: Props) {
  return (
    <div className={`flex items-center gap-3 my-8 ${className}`} style={{ opacity }}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary-dim to-transparent" />
      <div className="w-1 h-1 rounded-full bg-primary-dim shrink-0" />
      <div className="w-2 h-2 bg-primary-dim rotate-45 shrink-0" />
      <div className="w-1 h-1 rounded-full bg-primary-dim shrink-0" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary-dim to-transparent" />
    </div>
  )
}
```

- [ ] **Step 2: Create AmbientEmbers component**

Create `src/components/ui/AmbientEmbers.tsx`:

```tsx
const EMBER_CONFIGS = [
  { x: '8%', duration: '14s', delay: '0s', drift: '30px', driftEnd: '-15px', size: '2px' },
  { x: '20%', duration: '11s', delay: '3s', drift: '-20px', driftEnd: '25px', size: '3px' },
  { x: '32%', duration: '16s', delay: '1s', drift: '15px', driftEnd: '-30px', size: '2px' },
  { x: '45%', duration: '13s', delay: '5s', drift: '-25px', driftEnd: '10px', size: '3px' },
  { x: '55%', duration: '15s', delay: '2s', drift: '20px', driftEnd: '-20px', size: '2px' },
  { x: '67%', duration: '12s', delay: '7s', drift: '-10px', driftEnd: '30px', size: '3px' },
  { x: '78%', duration: '17s', delay: '4s', drift: '25px', driftEnd: '-5px', size: '2px' },
  { x: '90%', duration: '10s', delay: '6s', drift: '-15px', driftEnd: '20px', size: '3px' },
]

export function AmbientEmbers() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" aria-hidden="true">
      {EMBER_CONFIGS.map((config, i) => (
        <div
          key={i}
          className="ember fixed rounded-full"
          style={{
            left: config.x,
            width: config.size,
            height: config.size,
            background: `radial-gradient(circle, #f0c060, #f59e0b)`,
            animation: `ember-rise ${config.duration} linear infinite`,
            animationDelay: config.delay,
            willChange: 'transform, opacity',
            filter: 'blur(0.5px)',
            '--drift': config.drift,
            '--drift-end': config.driftEnd,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify components render**

Import and render both temporarily in App.tsx to confirm they work visually. Then remove test usage (they'll be placed properly in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/OrnamentalDivider.tsx src/components/ui/AmbientEmbers.tsx
git commit -m "feat: add OrnamentalDivider and AmbientEmbers components"
```

---

### Task 4: Global Overlays in App.tsx — Vignette, Grain, Embers

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ui/Toast.tsx:44` (z-index bump)

- [ ] **Step 1: Bump Toast z-index to z-[70]**

In `src/components/ui/Toast.tsx`, change line 44:

```tsx
// Before:
<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">

// After:
<div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2">
```

- [ ] **Step 2: Add overlays and embers to App.tsx**

Add import at top of `src/App.tsx`:

```tsx
import { AmbientEmbers } from '@/components/ui/AmbientEmbers'
```

Then add the three overlay elements to both the loading return and the main return. In the main return block, add them just before `</QueryClientProvider>`:

```tsx
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <CommandPalette />

      {/* Visual atmosphere overlays */}
      <AmbientEmbers />
      <div
        className="fixed inset-0 pointer-events-none z-[59]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          opacity: 0.025,
          mixBlendMode: 'overlay',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-[60]"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)',
        }}
      />
    </QueryClientProvider>
  )
```

Also update the loading `return` block to include overlays (requires wrapping in a fragment):

```tsx
  if (loading) {
    return (
      <>
        <div className="min-h-dvh flex items-center justify-center bg-bg-deep">
          <div className="text-center">
            <div className="text-3xl mb-3 torch-flicker"><GameIcon icon={GiRollingDices} size="3xl" /></div>
            <p className="text-text-muted text-sm">Loading...</p>
          </div>
        </div>
        <AmbientEmbers />
        <div
          className="fixed inset-0 pointer-events-none z-[59]"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            opacity: 0.025,
            mixBlendMode: 'overlay',
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none z-[60]"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)',
          }}
        />
      </>
    )
  }
```

- [ ] **Step 3: Verify z-index hierarchy in browser**

Check:
- Embers float behind all content (z-1)
- Paper grain is subtle overlay (z-59)
- Vignette darkens edges (z-60)
- Modals/dialogs still usable (z-50, under vignette but pointer-events passthrough)
- Toasts fully visible above everything (z-70)

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/ui/Toast.tsx
git commit -m "feat: add vignette, paper grain, and ambient embers to app shell"
```

---

### Task 5: Apply Gold Foil to Campaign/Session Names

**Files:**
- Modify: `src/features/campaigns/CampaignCard.tsx:29`
- Modify: `src/features/campaigns/CampaignOverview.tsx:31`
- Modify: `src/features/campaigns/HomePage.tsx:21`
- Modify: `src/features/sessions/SessionPage.tsx` (session title heading)

- [ ] **Step 1: CampaignCard — add gold-foil to campaign name**

In `src/features/campaigns/CampaignCard.tsx`, line 29:

```tsx
// Before:
<h3 className="text-lg group-hover:text-primary-light transition-colors">

// After:
<h3 className="text-lg gold-foil">
```

- [ ] **Step 2: CampaignOverview — add gold-foil to campaign name**

In `src/features/campaigns/CampaignOverview.tsx`, line 31:

```tsx
// Before:
<h2 className="text-2xl">{campaign.name}</h2>

// After:
<h2 className="text-2xl gold-foil">{campaign.name}</h2>
```

- [ ] **Step 3: HomePage — add gold-foil to app title**

In `src/features/campaigns/HomePage.tsx`, line 21:

```tsx
// Before:
<h1 className="text-xl">GM Book of Tricks</h1>

// After:
<h1 className="text-xl gold-foil">GM Book of Tricks</h1>
```

- [ ] **Step 4: SessionPage — add gold-foil to session title**

In `src/features/sessions/SessionPage.tsx`, line 64:

```tsx
// Before:
<h2 className="text-2xl">{session.name}</h2>

// After:
<h2 className="text-2xl gold-foil">{session.name}</h2>
```

- [ ] **Step 5: LoginPage — add gold-foil to app title**

In `src/features/auth/LoginPage.tsx`, line 37:

```tsx
// Before:
<h1 className="text-3xl mb-2">GM Book of Tricks</h1>

// After:
<h1 className="text-3xl mb-2 gold-foil">GM Book of Tricks</h1>
```

- [ ] **Step 6: Verify in browser**

Campaign names and session titles should show metallic gold gradient. Hover should add a subtle glow.

- [ ] **Step 7: Commit**

```bash
git add src/features/campaigns/CampaignCard.tsx src/features/campaigns/CampaignOverview.tsx src/features/campaigns/HomePage.tsx src/features/sessions/SessionPage.tsx src/features/auth/LoginPage.tsx
git commit -m "feat: apply gold foil effect to campaign and session names"
```

---

### Task 6: Apply Ornamental Corners to Key Cards

**Files:**
- Modify: `src/features/timeline/TimelineBlockCard.tsx:46`
- Modify: `src/features/campaigns/CampaignCard.tsx:26`
- Modify: `src/features/characters/PCSheet.tsx:35`

- [ ] **Step 1: TimelineBlockCard — add ornamental-corners**

In `src/features/timeline/TimelineBlockCard.tsx`, line 46:

```tsx
// Before:
<div className={`bg-bg-base rounded-[--radius-lg] border border-border border-l-3 ${style.borderColor} overflow-hidden`}>

// After:
<div className={`bg-bg-base rounded-[--radius-lg] border border-border border-l-3 ${style.borderColor} ornamental-corners`}>
```

Note: `overflow-hidden` is removed because it would clip the corners. The corners are inset at 4px so they stay inside the border.

- [ ] **Step 2: CampaignCard — add ornamental-corners**

In `src/features/campaigns/CampaignCard.tsx`, line 26:

```tsx
// Before:
className="bg-bg-base rounded-[--radius-lg] border border-border p-5 hover:border-border-hover hover:bg-bg-raised transition-all duration-[--duration-normal]"

// After:
className="bg-bg-base rounded-[--radius-lg] border border-border p-5 hover:border-border-hover hover:bg-bg-raised transition-all duration-[--duration-normal] ornamental-corners"
```

- [ ] **Step 3: PCSheet — add ornamental-corners**

In `src/features/characters/PCSheet.tsx`, line 35:

```tsx
// Before:
<div className="bg-bg-base rounded-[--radius-lg] border border-border overflow-hidden">

// After:
<div className="bg-bg-base rounded-[--radius-lg] border border-border ornamental-corners">
```

Note: `overflow-hidden` removed to prevent clipping the corner ornaments.

- [ ] **Step 4: Verify corners render and glow on hover**

Check in browser that gold corner accents appear on timeline blocks, campaign cards, and character sheets. Hover should brighten the corners.

- [ ] **Step 5: Commit**

```bash
git add src/features/timeline/TimelineBlockCard.tsx src/features/campaigns/CampaignCard.tsx src/features/characters/PCSheet.tsx
git commit -m "feat: add ornamental corners to timeline blocks, campaign cards, and PC sheets"
```

---

### Task 7: Add Ornamental Dividers to Key Pages

**Files:**
- Modify: `src/features/campaigns/CampaignOverview.tsx`
- Modify: `src/features/campaigns/HomePage.tsx`

- [ ] **Step 1: CampaignOverview — add divider between header and sessions**

In `src/features/campaigns/CampaignOverview.tsx`, add import:

```tsx
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
```

Add `<OrnamentalDivider />` between line 39 (closing `</div>` of the campaign header `mb-8` block) and line 42 (opening of the sessions `<div className="mb-8">` block).

- [ ] **Step 2: HomePage — add divider above inspiration board**

In `src/features/campaigns/HomePage.tsx`, add import:

```tsx
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
```

Add `<OrnamentalDivider />` before the `{/* Global Inspiration Inbox */}` section (around line 73).

- [ ] **Step 3: Verify dividers render**

Check in browser — diamond-dot-line dividers should appear between sections.

- [ ] **Step 4: Commit**

```bash
git add src/features/campaigns/CampaignOverview.tsx src/features/campaigns/HomePage.tsx
git commit -m "feat: add ornamental dividers to campaign overview and home page"
```

---

### Task 8: Apply Torch Flicker to Loading States

**Files:**
- Modify: `src/App.tsx:35`
- Modify: `src/features/campaigns/HomePage.tsx:41`
- Modify: `src/features/campaigns/CampaignOverview.tsx:18`
- Modify: `src/features/sessions/SessionPage.tsx:27`

- [ ] **Step 1: Add torch-flicker class to all loading state icon wrappers**

In each file, find the loading state `<div>` that wraps the `<GameIcon>` and add `torch-flicker` class:

```tsx
// Pattern — before:
<div className="text-3xl mb-3 animate-pulse"><GameIcon ... /></div>

// After:
<div className="text-3xl mb-3 torch-flicker"><GameIcon ... /></div>
```

Replace `animate-pulse` with `torch-flicker` in:
- `src/App.tsx` line 35
- `src/features/campaigns/HomePage.tsx` line 41
- `src/features/campaigns/CampaignOverview.tsx` line 18
- `src/features/sessions/SessionPage.tsx` line 27

- [ ] **Step 2: Verify flicker animation**

Loading states should now flicker like candlelight instead of pulsing.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/features/campaigns/HomePage.tsx src/features/campaigns/CampaignOverview.tsx src/features/sessions/SessionPage.tsx
git commit -m "feat: apply torch flicker animation to loading state icons"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Type check**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Font audit**

Run: `grep -r "DM.Sans\|Cormorant.Garamond" src/ --include="*.tsx" --include="*.ts" --include="*.css"`
Expected: Zero matches in source files.

- [ ] **Step 4: Full visual check**

Open app in browser and verify:
- [ ] Cinzel headings render correctly
- [ ] Crimson Pro body text is readable
- [ ] Gold foil on campaign names shimmers
- [ ] Vignette darkens viewport edges
- [ ] Paper grain texture visible on close inspection
- [ ] Embers float upward across the screen
- [ ] Card corners glow on hover
- [ ] Ornamental dividers between sections
- [ ] Torch flicker on loading states
- [ ] Toasts appear above vignette
- [ ] Modals/dialogs are usable (clicks work through vignette)
- [ ] Mobile layout is not broken

- [ ] **Step 5: Reduced motion check**

In macOS: System Settings → Accessibility → Display → Reduce motion. Verify embers disappear and flicker stops.
