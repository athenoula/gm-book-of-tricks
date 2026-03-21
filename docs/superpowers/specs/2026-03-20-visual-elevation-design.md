# Visual Elevation — Design Spec

## Context

Phase 1 of GM Book of Tricks established the "Warm Craft" aesthetic: dark charcoal backgrounds, amber/gold accents, serif headings. Phase 2 Visual Elevation layers illustrated, physical, tangible effects on top of this foundation — making the tool feel less like a SaaS dashboard and more like an artefact from a wizard's study.

All effects are CSS-only with zero new dependencies. The icon migration to game-icons.net SVGs (via react-icons) is already complete.

## Decisions

- **Font stack**: Cinzel (headings) + Crimson Pro (body) + Spectral SC (labels) + JetBrains Mono (stats)
- **Effects**: All seven — gold foil headings, ornamental dividers, card corners, vignette, paper grain, floating embers, torch flicker
- **Embers scope**: Every page as ambient background layer
- **Vignette scope**: Always on, every page

---

## 1. Font Stack Upgrade

### Current → New

| Role | Current | New | Weight |
|------|---------|-----|--------|
| Display/Hero | Cormorant Garamond 600 | Cinzel Decorative 400 | Display only |
| Headings (h1-h6) | Cormorant Garamond 400/600 | Cinzel 400/600/700 | All headings |
| Body text | DM Sans 400/500/600 | Crimson Pro 300/400/600 + italic | All body copy |
| Labels/caps | DM Sans uppercase | Spectral SC 400/600 | Small-caps labels |
| Stats/mono | JetBrains Mono 400 | JetBrains Mono 400 | Unchanged |

### Implementation

**File: `index.html` (line 14)**

Replace the current Google Fonts `<link>` tag with:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cinzel+Decorative:wght@400&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Spectral+SC:wght@400;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```

The `display=swap` parameter is preserved for fast initial render.

**File: `src/index.css` — @theme block**

Add font-family tokens to the existing `@theme` block so they're available as Tailwind utilities (`font-display`, `font-heading`, `font-body`, `font-label`, `font-mono`):

```css
@theme {
  /* ...existing tokens... */
  --font-display: 'Cinzel Decorative', serif;
  --font-heading: 'Cinzel', serif;
  --font-body: 'Crimson Pro', Georgia, serif;
  --font-label: 'Spectral SC', serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

**File: `src/index.css` — base styles**

- Update `body` font-family from `'DM Sans', system-ui, sans-serif` to `var(--font-body)`
- Update heading styles from `'Cormorant Garamond', Georgia, serif` to `var(--font-heading)`
- Update heading `letter-spacing` from `-0.01em` to `0.02em` (Cinzel looks better with slight positive tracking)

### Where Labels Appear

Spectral SC (via `font-label` utility) replaces uppercase DM Sans in these patterns:
- Timeline block type badges ("Scene", "Monster", "Battle")
- Stat block section headers ("ARMOR CLASS", "HIT POINTS", "SPECIAL ABILITIES")
- Navigation section labels

**Note**: Not every uppercase text becomes Spectral SC. Only decorative/thematic labels. Functional UI text (button labels, form inputs, tab labels) stays Crimson Pro.

### Audit Step

Before implementation, grep for any hardcoded `DM Sans` or `Cormorant Garamond` references in component files or inline styles that need updating.

---

## 2. Gold Foil Headings

### CSS Class

```css
.gold-foil {
  background: linear-gradient(135deg, #a67c28 0%, #f5d78e 35%, #d4a24e 50%, #f5d78e 65%, #a67c28 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.gold-foil:hover {
  filter: drop-shadow(0 2px 4px rgba(166, 124, 40, 0.3));
}
```

Note: `filter: drop-shadow` is applied only on hover to avoid continuous compositing cost on pages with multiple gold-foil elements. The gradient alone provides the metallic look; the shadow adds a glow on interaction.

### Where Applied

- Campaign names on CampaignCard and CampaignOverview
- The "Book of Tricks" app title/logo area
- Session titles in the timeline header
- Login page heading

**Not applied to**: regular page headings (h2 like "Characters", "Bestiary") — these stay amber-coloured Cinzel. Gold foil is reserved for campaign/session names to make them feel special.

### File

Added as a utility class in `src/index.css`.

---

## 3. Ornamental Dividers

### New Component: `src/components/ui/OrnamentalDivider.tsx`

Inline SVG component rendering the diamond-dot-line pattern:

```
──────── · ◆ · ────────
```

### Props

- `className?: string` — additional Tailwind classes
- `opacity?: number` — default 0.4

### Where Used

- Between major page sections (above h2 headings)
- In the session timeline between the header and content
- On the campaign overview page between stat sections
- As a footer accent on cards/dialogs

### Implementation

~15 lines. Pure inline SVG, no external assets. Colour inherits from `currentColor` so it adapts to the amber palette.

---

## 4. Card Corner Ornaments

### CSS

Applied via `::before` and `::after` pseudo-elements on target cards:

```css
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
  transition: border-color 0.3s;
  pointer-events: none;
}
.ornamental-corners::before {
  top: 4px; left: 4px;
  border-width: 2px 0 0 2px;
}
.ornamental-corners::after {
  bottom: 4px; right: 4px;
  border-width: 0 2px 2px 0;
}
.ornamental-corners:hover::before,
.ornamental-corners:hover::after {
  border-color: rgba(245, 158, 11, 0.5);
}
```

Note: Corners are positioned at `4px` inset (not `-1px`) to avoid clipping when parent has `overflow-hidden`. This also produces a cleaner inset-frame look.

### Constraints

Target elements **must not** use `::before` or `::after` for other purposes (including Tailwind `before:` / `after:` utilities). If a component needs pseudo-elements for other purposes, use the `OrnamentalDivider` component instead of this class.

### Where Applied

- Timeline block cards (`TimelineBlockCard.tsx`)
- Character sheet cards (`PCSheet.tsx`)
- Campaign cards on home page (`CampaignCard.tsx`)

### File

Added as a utility class in `src/index.css`.

---

## 5. Vignette Overlay

### Implementation

Rendered as a dedicated `<div>` in the root layout — **not** a `body` pseudo-element. This avoids z-index conflicts with modals/toasts and keeps `body::after` available for future use.

### Component

Add a vignette div in `App.tsx` (or the outermost layout wrapper):

```tsx
<div
  className="fixed inset-0 pointer-events-none"
  style={{
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)',
    zIndex: 60,
  }}
/>
```

### z-index Strategy

- Sidebar: `z-40`
- MobileNav: `z-40`
- Modals/CommandPalette: `z-50`
- **Vignette: `z-[60]`** — above all content including modals
- Toasts: need to be bumped to `z-[70]` (currently `z-50`)

The vignette intentionally covers modal edges for atmosphere. It has `pointer-events: none` so interaction is unaffected. Toasts are bumped above it since they need full visibility.

### Scope

Always on, every page.

### File

Rendered in `src/App.tsx`. Toast z-index updated in `src/components/ui/Toast.tsx`.

---

## 6. Paper Grain Noise

### Implementation

Rendered as a dedicated `<div>` in the root layout — **not** a `body` pseudo-element. Same rationale as vignette.

### Component

Add a grain div in `App.tsx`:

```tsx
<div
  className="fixed inset-0 pointer-events-none"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
    opacity: 0.025,
    mixBlendMode: 'overlay' as const,
    zIndex: 59,
  }}
/>
```

### Scope

Always on, every page. z-index 59 sits below the vignette (60).

### File

Rendered in `src/App.tsx`.

---

## 7. Floating Embers

### New Component: `src/components/ui/AmbientEmbers.tsx`

Renders 8 absolutely positioned `<div>` elements with CSS keyframe animations. Each ember has randomised CSS custom properties for position, speed, drift, and size.

### CSS Keyframes (in `src/index.css`)

```css
@keyframes ember-rise {
  0% { transform: translateY(100vh) scale(0); opacity: 0; }
  8% { opacity: 0.7; transform: translateY(90vh) scale(1); }
  50% { opacity: 0.4; transform: translateY(50vh) translateX(var(--drift)); }
  100% { transform: translateY(-5vh) translateX(var(--drift-end)) scale(0.3); opacity: 0; }
}
```

### Props

- `count?: number` — default 8
- `className?: string`

### Scope

Rendered once in `App.tsx`. Fixed positioning, `pointer-events: none`, `z-index: 1` (below all content).

### Reduced Motion

The existing global `prefers-reduced-motion` rule in `index.css` handles animation duration. Additionally, embers use `display: none` to remove them from the render tree entirely:

```css
@media (prefers-reduced-motion: reduce) {
  .ember { display: none; }
}
```

### Performance

Each ember gets `will-change: transform, opacity` to promote to its own compositor layer. Count defaults to 8 (not 12-15) to balance atmosphere with battery usage.

### File

New component at `src/components/ui/AmbientEmbers.tsx`. Keyframes in `src/index.css`.

---

## 8. Torch Flicker

### CSS (in `src/index.css`)

```css
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
```

### Where Applied

Sparingly — this is an accent, not a global effect:
- Loading state icons (the dice icon that appears during data fetching)
- The active combatant indicator in the initiative tracker
- Optionally on the sidebar logo/toggle area

### Reduced Motion

Covered by the existing global `prefers-reduced-motion` rule. The per-class rule is defense-in-depth:

```css
@media (prefers-reduced-motion: reduce) {
  .torch-flicker { animation: none; }
}
```

### File

Added to `src/index.css`.

---

## Files Summary

### Modified Files

| File | Changes |
|------|---------|
| `index.html` | Replace Google Fonts link tag with new font families |
| `src/index.css` | Font tokens in @theme, body/heading font-family, gold-foil class, ornamental-corners class, ember keyframes, flicker keyframes, reduced motion rules |
| `src/App.tsx` | Add `<AmbientEmbers />`, vignette overlay div, grain overlay div |
| `src/components/ui/Toast.tsx` | Bump z-index to `z-[70]` (above vignette) |
| `src/components/layout/CampaignLayout.tsx` | No changes needed (embers in App.tsx) |
| `src/features/timeline/TimelineBlockCard.tsx` | Add `ornamental-corners` class |
| `src/features/campaigns/CampaignCard.tsx` | Add `gold-foil` to campaign name, `ornamental-corners` to card |
| `src/features/campaigns/CampaignOverview.tsx` | Add `gold-foil` to campaign name, `OrnamentalDivider` between sections |
| `src/features/campaigns/HomePage.tsx` | Add `OrnamentalDivider`, `gold-foil` on heading |
| `src/features/sessions/SessionPage.tsx` | Add `gold-foil` to session title |
| `src/features/characters/PCSheet.tsx` | Add `ornamental-corners` to sheet card |

### New Files

| File | Purpose |
|------|---------|
| `src/components/ui/OrnamentalDivider.tsx` | Reusable SVG divider component |
| `src/components/ui/AmbientEmbers.tsx` | Floating ember particles component |

### No Changes To

- Color palette values (charcoal + amber stay the same)
- Component architecture
- State management
- Routing
- Dependencies (no new npm packages)

---

## Verification

1. `npx tsc --noEmit` — type check passes
2. `npx vite build` — build succeeds
3. Grep for `DM Sans` and `Cormorant Garamond` — zero remaining references in src/
4. Visual check in browser:
   - Cinzel headings, Crimson Pro body text render correctly
   - Gold foil shimmer visible on campaign names (hover adds glow)
   - Vignette darkens viewport edges (covers modal edges, toasts float above)
   - Paper grain visible at close inspection
   - Embers float upward on all pages
   - Card corners glow gold on hover
   - Ornamental dividers appear between sections
   - Flicker animation on loading states
5. `prefers-reduced-motion` test — disable animations in OS settings, verify embers hidden and flicker stopped
6. Mobile responsive check — effects don't break layout on small screens
7. z-index check — toasts appear above vignette, modals are usable, sidebar is not obscured
