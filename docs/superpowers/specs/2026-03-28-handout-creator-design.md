# Handout Creator — Design Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Overview

A handout creation system that lets GMs build printable, shareable props — scrolls, wanted posters, royal decrees, tavern menus, and more. Designed for print first, looks good on screen. GMs pick a template, customise text and styling, optionally add a wax seal, then export as PNG.

Handouts live in their own sidebar section (accessible campaign-wide) and can be embedded into session timelines as blocks.

---

## Templates

Eight template types, each with its own form fields, default font pairing, and parchment treatment.

### Scroll / Letter
- **Fields:** title, body, signature
- **Default font:** Elegant script
- **Parchment:** Warm sepia, darkened edges, rolled-edge effect top and bottom

### Wanted Poster
- **Fields:** heading ("WANTED"), portrait image upload, name, description, reward amount
- **Default font:** Rough block letters
- **Parchment:** Heavy staining, torn/rough edges, tack holes in corners

### Royal Decree / Official Notice
- **Fields:** crest (seal positioned at top), title, body, signature line, date
- **Default font:** Formal serif
- **Parchment:** Clean vellum, minimal aging, ornamental border

### Map Note / Treasure Map
- **Fields:** image upload (or blank), caption, annotations
- **Default font:** Hasty hand
- **Parchment:** Torn edges, heavy aging, coffee-stain marks

### Tavern Menu / Shop Sign
- **Fields:** establishment name, sections (each with item name + price rows)
- **Default font:** Chalk/casual
- **Parchment:** Dark wood-grain tint, chalky text effect

### Broadsheet / Newspaper
- **Fields:** masthead, date, headline, columns (2-3 article blocks), ads section
- **Default font:** Newsprint serif
- **Parchment:** Yellowed newsprint, fold crease lines

### Invitation / Card
- **Fields:** host line, event title, date/time/place, RSVP line, decorative border style
- **Default font:** Elegant calligraphy
- **Parchment:** Light cream, gilt/ornamental border, minimal aging

### Blank Parchment
- **Fields:** body text only
- **Default font:** User's choice (no preset)
- **Parchment:** Standard parchment, light aging

All templates optionally display wax seal controls.

---

## Editor Interface

Split-panel layout: form controls on the left, live preview on the right.

### Left Panel — Form Controls

1. **Template selector** — chip/pill buttons for all 8 templates. Switching template resets fields to that template's defaults but preserves any shared content (title, body).
2. **Content fields** — template-specific fields as described above. Body text uses a plain textarea (not rich text).
3. **Font style** — 3-4 quick presets per template (e.g. "Elegant", "Hasty", "Formal") shown as named buttons with font preview. Each preset maps to a specific Google Font. Link to "choose from all fonts" opens a dropdown of 8-10 handwriting/calligraphy fonts with live preview.
4. **Text size** — slider control, updates preview live.
5. **Wax seal section** — see Wax Seal Builder below.
6. **Action buttons** — Save and Export PNG.

### Right Panel — Live Preview

- Renders the handout at approximately print scale.
- Updates live as form fields change.
- Wax seal is draggable on the preview to reposition (position stored as percentage).
- Scroll/zoom for detail inspection.

### Mobile Layout

- Stacks vertically: form on top, preview below.
- Preview is scrollable, seal draggable via touch.

---

## Wax Seal Builder

### Built Seal

- **Icon:** picked from game-icons.net library via a grid modal with search/filter. Same icon set the app already uses.
- **Ring text:** optional text rendered in small caps around the inner edge of the seal (e.g. "House Ashara").
- **Colour:** user-editable. Preset swatches (crimson, forest green, navy, black, gold, royal purple) plus custom hex input.
- **Shape:** round (circle), shield (CSS clip-path), oval (ellipse).
- **Position:** stored as `{ x, y }` percentages from top-left. Set by dragging on the preview.

### Visual Treatment

- **Base:** radial gradient from the chosen colour — lighter highlight top-left, darker bottom-right — for a 3D wax look.
- **Icon:** rendered in the same hue, 30-40% darker than the base colour, as if physically pressed/embossed into the wax.
- **Ring text:** same darkened shade as the icon, small caps, traced around the inner ring.

### Custom Seal Upload

- Alternative to the built seal: upload a custom image.
- Stored in `campaign-images` bucket.
- Same draggable positioning on the preview.

### Data Shape

```typescript
type Seal = {
  type: 'built'
  icon: string          // game-icons component name e.g. "GiCrossedSwords"
  ring_text: string
  colour: string        // hex e.g. "#c0392b"
  shape: 'round' | 'shield' | 'oval'
  position: { x: number; y: number }
} | {
  type: 'uploaded'
  custom_image_url: string
  position: { x: number; y: number }
}
```

---

## Text Customisation

### Font Presets Per Template

Each template ships with a curated default font that matches its character. The 3-4 quick presets per template offer alternative vibes without overwhelming choice.

### Full Font Picker

"Choose from all fonts" opens a dropdown of 8-10 Google Fonts in the handwriting/calligraphy/display space. Each option shows a live preview of the font at the current text size. Selecting a font overrides the template default.

### Text Size

Slider from small to large. Affects body text; title scales proportionally. Live preview update.

---

## Data Model

### New Table: `handouts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| campaign_id | uuid | FK → campaigns, NOT NULL |
| name | text | Display name in handout list |
| template | text | Enum: scroll, wanted, decree, map_note, tavern, broadsheet, invitation, blank |
| content | jsonb | Template-specific fields (title, body, signature, items, etc.) |
| style | jsonb | `{ font_family, font_size, text_align }` |
| seal | jsonb | Nullable. Seal data as defined above |
| image_url | text | Nullable. Uploaded images (wanted poster portrait, map background) |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

**RLS policy:** Same as all other tables — `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`.

### Timeline Integration

- New `block_type: 'handout'` value on `timeline_blocks`.
- `content_snapshot` stores the full handout render data (content, style, seal, template) so the timeline block is self-contained.
- Content Drawer lists campaign handouts for adding to scenes, same pattern as monsters/NPCs/spells.

### Storage

- Uploaded images (portraits, map backgrounds, custom seals) go to the existing `campaign-images` bucket.
- Client-side compression before upload (existing pattern — max 1MB, 1920px).

---

## Feature Hooks

Following existing TanStack Query patterns:

- `useHandouts(campaignId)` — fetch all handouts for campaign
- `useCreateHandout()` — insert new handout
- `useUpdateHandout()` — update handout fields
- `useDeleteHandout()` — delete handout
- `useUpdateHandoutImage()` — upload image to storage, update image_url

---

## Sidebar & Navigation

- New "Handouts" entry in the campaign sidebar.
- Icon: `GiQuillInk` (Quill Ink).
- Position: after Locations, before Generators.

---

## Handouts Page

- **Grid view** of handout thumbnails — mini parchment previews showing template type and title.
- **Click** opens the editor for that handout.
- **Create new** button → template picker → opens editor with chosen template defaults.
- **Delete** with confirmation dialog.

---

## Export

- **PNG export** using `html-to-image` (or equivalent library).
- Renders the preview panel at 2x resolution for print quality.
- Downloads as `{handout-name}.png`.

---

## Parchment Base

Single aged parchment texture used across all templates. Each template applies a different treatment:

- **Aged edges:** radial gradient darkening toward edges (intensity varies by template)
- **Grain:** SVG feTurbulence noise overlay at low opacity
- **Staining:** CSS pseudo-elements for coffee stains, water marks (template-specific)
- **Edge effects:** clip-path or border treatments for torn edges, rolled edges
- **Wood/newsprint variants:** colour-shifted base for tavern menu (dark) and broadsheet (yellow)

All treatments are CSS-only — no image assets required. This keeps the handouts lightweight and resolution-independent for PNG export.
