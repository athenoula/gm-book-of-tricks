# Rich Text Editor for Scene Writing

## Overview

Replace the current markdown textarea in SceneBlock with a Tiptap-powered WYSIWYG rich text editor. The editor provides a formatting toolbar with keyboard shortcuts, making it easy to bold, italicize, change text size, create lists, and add read-aloud blockquotes without writing raw markdown.

This is the first of three planned enhancements:
1. **Rich text editor** (this spec)
2. Quick-reference panel for live play
3. Session recap and thread tracker

The editor is built first because it improves both scene writing and future recap writing.

## Goals

- Every formatting option accessible via both toolbar button click and keyboard shortcut
- WYSIWYG editing — what you see while writing is what you see in Play mode
- Match the existing warm craft aesthetic (amber/gold, serif fonts, dark surfaces)
- Minimal change surface — two new files, one modified file
- No disruption to existing scenes — backward-compatible with markdown content

## Non-Goals

- Slash commands, drag-and-drop blocks, or Notion-style features
- Collaborative/multiplayer editing
- AI-assisted writing
- Inline entity references (@-mentions for NPCs, spells, etc.) — potential future extension

## Technical Approach

### Library: Tiptap

Tiptap (built on ProseMirror) was chosen over Slate.js and Novel for:
- Pre-built extensions for all needed formatting (less custom code, fewer edge-case bugs)
- Battle-tested handling of browser contentEditable quirks (cursor, selection, paste)
- Headless architecture — full control over toolbar and editor styling
- Free tier covers all required features
- Custom extensions supported for future needs (e.g., @-mentions)

### Formatting Features

| Feature | Toolbar | Keyboard Shortcut |
|---------|---------|-------------------|
| Heading 1 | Dropdown | Ctrl+1 |
| Heading 2 | Dropdown | Ctrl+2 |
| Heading 3 | Dropdown | Ctrl+3 |
| Normal text | Dropdown | Ctrl+0 |
| Small text | Dropdown | — |
| Bold | Button | Ctrl+B |
| Italic | Button | Ctrl+I |
| Highlight | Button | Ctrl+Shift+H |
| Bullet list | Button | Ctrl+Shift+8 |
| Numbered list | Button | Ctrl+Shift+7 |
| Read-aloud blockquote | Button | Ctrl+Shift+B |
| Horizontal rule | Button | Ctrl+Enter |

### Data Storage & Migration

**No database migration required.**

- The `scenes.content` column remains `text`
- New scenes store Tiptap JSON (stringified) in `content`
- Existing scenes with markdown are detected and converted on load:
  1. Attempt to parse `content` as JSON
  2. If it has `type: "doc"`, treat as Tiptap format
  3. Otherwise, treat as markdown and convert via Tiptap's markdown parser
- Once an old scene is edited and saved, it's stored as JSON going forward
- `MarkdownPreview` component can coexist during transition and be removed later

### Component Architecture

**New files:**

- `app/src/features/timeline/SceneEditor.tsx` — Tiptap editor component
  - Configures editor instance with extensions
  - Renders formatting toolbar
  - Keyboard shortcut hints in footer
  - `onChange` callback passes JSON content to parent
  - Read-only mode for Play view (toolbar hidden, content not editable)

- `app/src/features/timeline/useSceneEditor.ts` — Custom hook for Tiptap configuration
  - StarterKit extension (bold, italic, headings, lists, blockquote, horizontal rule)
  - Highlight extension (amber color)
  - Text size extension (small text)
  - Keyboard shortcut mappings

**Modified files:**

- `app/src/features/timeline/SceneBlock.tsx` — Replace textarea with `<SceneEditor />`
  - Edit/save/cancel flow unchanged
  - Passes `content` and `onChange` to SceneEditor
  - Passes `isEditing` and `isPrep` for mode control

**Untouched:**
- `useScenes.ts` — reads/writes strings, format-agnostic
- `SessionTimeline.tsx` — renders SceneBlock, no changes
- Timeline drag-and-drop, scene status cycling, all other timeline behavior

## Styling

### Toolbar
- Background: `bg-base` (#1c1917) matching existing card surfaces
- Button groups separated by 1px vertical dividers (`border` color)
- Default button state: transparent background, `text-body` color
- Active state (cursor in formatted text): amber background (`primary` at 15% opacity), amber border (30% opacity), `primary-light` text color
- Grouped logically: [Text style dropdown] | [B I Highlight] | [Bullet Numbered] | [Blockquote HR]

### Editor Surface
- Font: Lora/Georgia serif (matches existing scene content)
- Text color: `text-body` (#d6d3d1) for body, `text-heading` (#fef3c7) for bold and headings
- Background: `bg-raised` (#292524)
- Border radius: `radius-lg` (12px) on the outer container
- Line height: 1.7 for comfortable reading

### Read-Aloud Blockquote
- 3px left border in `primary` (#f59e0b)
- Background: `primary-ghost` (amber at 8% opacity)
- Rounded right corners only (`radius-md`)
- Italic text in `text-heading` color
- Identical styling in both edit and play mode

### Highlight
- Background: `primary-light` (#fbbf24) at 25% opacity
- Subtle border-radius (3px)
- Designed for GM-critical info: DCs, damage values, passwords, trigger conditions

### Play Mode
- Toolbar hidden entirely
- Editor set to read-only (non-editable)
- Content renders identically to edit mode — true WYSIWYG
- Replaces MarkdownPreview for scene content

### Footer Bar (Edit Mode Only)
- Keyboard shortcut hints on the left (small, muted text)
- Cancel and Save buttons on the right (matching existing button styles)

## Dependencies

New npm packages:
- `@tiptap/react` — React bindings
- `@tiptap/starter-kit` — Core extensions (bold, italic, headings, lists, blockquote, HR, code)
- `@tiptap/extension-highlight` — Highlight mark
- `@tiptap/extension-text-style` — Text style foundation for font size
- `@tiptap/pm` — ProseMirror peer dependencies

## Future Extensibility

The Tiptap architecture supports adding these later without rearchitecting:
- Custom `@`-mention extension for inline NPC/spell references (ties into quick-reference panel)
- AI-assisted writing via custom extension
- Image embedding via Tiptap Image extension
- The rich text editor will also be reused for session recaps (enhancement #3)
