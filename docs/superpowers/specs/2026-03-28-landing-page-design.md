# Landing Page Design

**Date:** 2026-03-28
**Status:** Draft

## Overview

A public marketing landing page for GM Book of Tricks that showcases the tool's features through animated demos, targeting GMs who already understand the pain of session prep. The page drives exploration first, sign-up second.

## Target Audience

Game Masters who already know the pain of session prep, initiative tracking, and in-play reference. No need to educate on what a GM toolkit is — speak directly to the problem.

## Goals

1. **Showcase the tool** — let GMs explore what it does through animated demos
2. **Capture SEO traffic** — rank for tool searches ("D&D session prep tool") and content searches ("D&D initiative tracker online") via individual feature routes
3. **Drive sign-ups** — available but not pushy; the features sell themselves

## Routing Changes

### New Public Routes

| Route | Component | Auth |
|-------|-----------|------|
| `/` | `LandingPage` | Public (redirect to `/home` if authenticated) |
| `/login` | `LoginPage` (existing, relocated) | Public |
| `/features/:slug` | `FeaturePage` | Public |

### Feature Slugs

- `/features/session-timeline`
- `/features/initiative-tracker`
- `/features/generators`
- `/features/web-clipper`
- `/features/spellbook`

### Auth Redirect

Authenticated users hitting `/` are redirected to `/home` (the existing campaign dashboard) via the route's `beforeLoad` hook.

### SEO Strategy

Stay on hash history (`createHashHistory`) for now. Basic SEO via `<meta>` tags in `index.html` and `document.title` updates per route. Prerendering or SSR can be added later when SEO becomes a higher priority.

## Page Structure

The landing page is a single continuous scroll with seven sections:

### 1. Navigation Bar

- Fixed/sticky at top
- Left: Gold foil logo text "GM Book of Tricks" (Cinzel Decorative)
- Right: "Features" anchor link, "Sign In" button (links to `/login`)
- Transparent background that gains opacity on scroll
- Collapses to hamburger on mobile

### 2. Hero Section (~100vh)

**Layout:** Split — copy on the left, animated demo on the right.

**Left side:**
- Spectral SC label: "FORGED FOR GAME MASTERS"
- Cinzel Decorative gold foil title: "GM Book of Tricks"
- Crimson Pro tagline: "Session prep, initiative tracking, and in-play reference — so you can focus on the story, not the bookkeeping."
- Primary CTA: "Start Your Campaign" (gold gradient button, links to `/login`)
- Secondary CTA: "See Features" (ghost button, smooth-scrolls to feature showcase)

**Right side:**
- Floating app window frame (mock browser chrome with traffic light dots)
- Auto-playing feature demo that cycles through the 5 showcase features
- Each demo plays ~8-10 seconds before transitioning

**Atmosphere:** Ambient embers, paper grain overlay, vignette — matching the existing app aesthetic.

### 3. Trust Strip

A thin horizontal bar below the hero:
- "Free during beta · Built by a GM, for GMs · D&D 5e & system-agnostic"
- Understated styling — Spectral SC, muted text, ornamental divider borders
- No fake metrics or inflated social proof

### 4. Feature Showcase (5 alternating rows)

Each row is a full-width section with copy on one side and an animated demo on the other, alternating left/right per row. Ornamental dividers separate rows.

**Per row:**
- Spectral SC category label (e.g., "SESSION PREP")
- Cinzel heading (e.g., "Session Timeline")
- Crimson Pro description paragraph (2-3 sentences)
- "Learn more →" link to the `/features/:slug` route
- Animated demo component on the opposite side

**Row order and content:**

1. **Session Timeline** (copy left, demo right)
   - Category: SESSION PREP
   - Demo: Scene blocks sliding into a timeline, a card being dragged to reorder, notes fading in
   - Copy: Organize scenes, battles, NPCs, and notes into a living timeline. Drag to reorder on the fly. Everything at your fingertips mid-session.

2. **Initiative Tracker** (demo left, copy right)
   - Category: IN-PLAY
   - Demo: Combatant rows appearing with stagger, HP bar animating down, condition badge added, turn marker advancing
   - Copy: Real-time combat management with HP tracking, D&D 5e conditions, and turn order. Share with players via live sync.

3. **Spellbook** (copy left, demo right)
   - Category: REFERENCE
   - Demo: Search field with typing animation, spell cards filtering and staggering in, a card flipping to show spell details
   - Copy: Search the full D&D 5e spell list. Filter by level, school, or class. Import spells to your campaign and assign to characters.

4. **NPC & Encounter Generators** (demo left, copy right)
   - Category: GENERATORS
   - Demo: "Generate" button press, fields filling with randomized NPC data (name, trait, motivation), results appearing with stagger
   - Copy: Random NPCs with personality, balanced encounters for any party level, and loot tables on demand. Never be caught unprepared.

5. **Web Clipper** (copy left, demo right)
   - Category: UTILITY
   - Demo: Mock browser tab with D&D content, clipper icon appearing, content being "clipped" and flying into a campaign inbox
   - Copy: Found a great monster stat block or map online? Clip it straight to your campaign with our browser extension. Your inspiration board fills itself.

**Scroll animations:** Each row fades in and slides up when scrolled into view (Intersection Observer + motion/react). Demos auto-play when visible, pause when not.

### 5. More Features Grid

A section heading: "And there's more..." (Cinzel, centered)

A responsive grid of compact feature cards for features not in the showcase:
- Bestiary
- Character Management
- Locations
- Quick Reference
- DM's Cheat Sheet
- Plot Threads
- Dice Roller
- Inspiration Board
- Campaign Dashboard

**Per card:**
- Game icon (from react-icons `Gi` set)
- Cinzel title
- One-line Crimson Pro description
- Subtle hover effect (border glow or slight lift)

**Grid:** 3 columns on desktop, 2 on tablet, 1 on mobile.

### 6. Final CTA (~50vh)

- Ornamental divider above
- Centered Cinzel Decorative heading: "Your next session starts here."
- Crimson Pro subtext: "Free during beta. No credit card required."
- Large gold gradient CTA button: "Start Your Campaign"
- Ornamental divider below

### 7. Footer

- Minimal, dark background
- Left: Gold foil logo
- Center: Feature anchor links + feature route links
- Right: "Made with ♥ by a GM"
- Copyright line
- Optional: GitHub link, feedback link

## Individual Feature Pages (`/features/:slug`)

Lightweight pages that reuse the demo component from the landing page.

**Layout:**
- Nav bar (same as landing page)
- Split layout: demo on one side, extended copy on the other
- Extended copy includes more keyword-rich content for SEO (3-5 paragraphs)
- `document.title` updated to feature-specific title (e.g., "Session Timeline | GM Book of Tricks")
- "← All Features" back link
- CTA section at the bottom: "Try [Feature Name]" with sign-up button
- Footer (same as landing page)

## Animated Demo Components

Each demo is a self-contained React component using `motion/react` primitives. No GIFs, no screen recordings — scripted CSS/motion animations that simulate the app.

**Shared behavior:**
- Auto-play when scrolled into view (Intersection Observer)
- Pause when scrolled out of view
- Loop on ~8-10 second cycle
- Styled to match the app's actual aesthetic (same colors, fonts, border styles)
- Wrapped in a consistent "app window" frame component

**Components:**
- `TimelineDemo` — scene blocks animating into a timeline layout
- `InitiativeDemo` — combatant rows with HP bars and conditions
- `SpellbookDemo` — search + filter + card reveal
- `GeneratorsDemo` — button press + randomized results filling in
- `WebClipperDemo` — mock browser + clip action + inbox animation

## File Structure

```
src/features/landing/
├── LandingPage.tsx           # Main landing page component
├── components/
│   ├── LandingNav.tsx        # Sticky navigation bar
│   ├── HeroSection.tsx       # Hero with split layout
│   ├── TrustStrip.tsx        # Social proof bar
│   ├── FeatureShowcase.tsx   # Alternating feature rows
│   ├── FeatureRow.tsx        # Single alternating row
│   ├── MoreFeaturesGrid.tsx  # Compact feature card grid
│   ├── FinalCTA.tsx          # Closing call to action
│   └── LandingFooter.tsx     # Footer
├── demos/
│   ├── DemoFrame.tsx         # Shared app window frame
│   ├── TimelineDemo.tsx
│   ├── InitiativeDemo.tsx
│   ├── SpellbookDemo.tsx
│   ├── GeneratorsDemo.tsx
│   └── WebClipperDemo.tsx
├── FeaturePage.tsx           # Individual feature route page
└── feature-data.ts           # Feature metadata (titles, descriptions, slugs, SEO)
```

## Visual Design

Matches the existing app aesthetic exactly:

- **Background:** Deep charcoal (#141210) with paper grain overlay and vignette
- **Typography:** Cinzel Decorative (hero), Cinzel (headings), Crimson Pro (body), Spectral SC (labels)
- **Accents:** Amber/gold (#f59e0b, #fbbf24) for CTAs, highlights, gold foil text
- **Effects:** Ambient embers (AmbientEmbers component), ornamental dividers, gold foil gradients
- **Borders:** Translucent amber borders on cards and demo frames
- **Animations:** Scroll-triggered fade-in/slide-up via motion/react, matching existing PageTransition patterns

## Mobile Responsiveness

- **Hero:** Stacks vertically — copy on top, demo below
- **Feature rows:** Stack vertically — copy then demo (consistent order, no alternating on mobile)
- **More Features grid:** 3 col → 2 col → 1 col
- **Nav:** Hamburger menu on mobile
- **Demo frames:** Scale down proportionally, maintain aspect ratio
- **CTAs:** Full-width buttons on mobile

## Dependencies

No new dependencies. Uses existing:
- `motion/react` for animations
- `react-icons` (Gi set) for feature icons
- Tailwind CSS for styling
- TanStack Router for new routes
- Intersection Observer API (browser native) for scroll-triggered demos
