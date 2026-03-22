# Rich Text Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the markdown textarea in SceneBlock with a Tiptap WYSIWYG rich text editor featuring a formatting toolbar, keyboard shortcuts, and backward-compatible content detection.

**Architecture:** New `SceneEditor` component wraps Tiptap with a custom toolbar and keyboard shortcuts. `SceneBlock` swaps its textarea for `SceneEditor`, keeping the existing save/cancel flow. Content detection (JSON vs markdown) happens at the editor level — no database migration needed.

**Tech Stack:** Tiptap (ProseMirror), `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-highlight`, `@tiptap/extension-text-style`, React 19, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-21-rich-text-editor-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/src/features/timeline/useSceneEditor.ts` | Create | Tiptap hook — configures extensions, keyboard shortcuts, content detection |
| `app/src/features/timeline/SceneEditor.tsx` | Create | Editor component — toolbar, editor surface, footer, read-only mode |
| `app/src/features/timeline/SceneBlock.tsx` | Modify | Swap textarea for `<SceneEditor />`, pass content/onChange/mode props |

**Untouched:** `useScenes.ts`, `SessionTimeline.tsx`, `MarkdownPreview.tsx` (still used by timeline blocks)

---

### Task 1: Install Tiptap Dependencies

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install Tiptap packages**

```bash
cd app && npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight @tiptap/extension-text-style @tiptap/pm
```

- [ ] **Step 2: Verify installation**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: No new type errors from Tiptap packages.

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: add tiptap editor dependencies"
```

---

### Task 2: Create useSceneEditor Hook

**Files:**
- Create: `app/src/features/timeline/useSceneEditor.ts`

This hook configures Tiptap with all extensions, keyboard shortcuts, and the content detection logic (JSON vs markdown).

- [ ] **Step 1: Create the hook file**

```typescript
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'

// Custom extension for small text (font-size via TextStyle)
const SmallText = Extension.create({
  name: 'smallText',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
})

// Custom keyboard shortcuts for headings and blockquote
const CustomShortcuts = Extension.create({
  name: 'customShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-1': () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      'Mod-2': () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      'Mod-3': () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      'Mod-0': () => this.editor.chain().focus().setParagraph().run(),
      'Mod-Shift-h': () => this.editor.chain().focus().toggleHighlight().run(),
      'Mod-Shift-b': () => this.editor.chain().focus().toggleBlockquote().run(),
    }
  },
})

/**
 * Detect whether content is Tiptap JSON or raw markdown.
 * Returns a Tiptap-compatible content value.
 */
function parseContent(content: string | null | undefined): string | Record<string, unknown> {
  if (!content || !content.trim()) return ''
  try {
    const parsed = JSON.parse(content)
    if (parsed && parsed.type === 'doc') return parsed
  } catch {
    // Not JSON — treat as markdown/HTML
  }
  // Return as-is for Tiptap to parse as text/HTML.
  // Tiptap's StarterKit can parse basic HTML. For markdown,
  // we convert the common patterns to simple HTML.
  return markdownToSimpleHtml(content)
}

/**
 * Convert basic markdown patterns to HTML for Tiptap ingestion.
 * Handles: headings, bold, italic, blockquotes, lists, horizontal rules.
 * This is intentionally simple — it covers the patterns used in existing scenes.
 */
function markdownToSimpleHtml(md: string): string {
  let html = md
    // Headings (must be before other line processing)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Convert remaining plain lines to paragraphs
  // Split by double newlines for paragraphs
  const blocks = html.split(/\n\n+/)
  html = blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      // Already wrapped in a block element
      if (/^<(h[1-3]|blockquote|hr|ul|ol|li|p)/.test(trimmed)) return trimmed
      // Wrap in paragraph, preserving single line breaks as <br>
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .join('')

  return html
}

interface UseSceneEditorOptions {
  content: string | null | undefined
  editable: boolean
  onUpdate?: (json: string) => void
}

export function useSceneEditor({ content, editable, onUpdate }: UseSceneEditorOptions) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default keyboard shortcuts for heading that conflict with ours
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({
        multicolor: false,
      }),
      TextStyle,
      SmallText,
      CustomShortcuts,
    ],
    content: parseContent(content),
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(JSON.stringify(editor.getJSON()))
      }
    },
  })

  return editor
}

export { parseContent }
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/useSceneEditor.ts
git commit -m "feat: add useSceneEditor hook with tiptap config and markdown detection"
```

---

### Task 3: Create SceneEditor Component

**Files:**
- Create: `app/src/features/timeline/SceneEditor.tsx`

The editor component with toolbar, editor surface, and footer.

- [ ] **Step 1: Create the SceneEditor component**

```tsx
import { EditorContent } from '@tiptap/react'
import { useSceneEditor } from './useSceneEditor'
import type { Editor } from '@tiptap/react'

interface Props {
  content: string | null | undefined
  editable: boolean
  onChange?: (json: string) => void
}

export function SceneEditor({ content, editable, onChange }: Props) {
  const editor = useSceneEditor({
    content,
    editable,
    onUpdate: onChange,
  })

  if (!editor) return null

  // Empty state for read-only mode
  if (!editable && editor.isEmpty) {
    return <p className="text-text-muted text-sm italic">Empty scene — click edit to add content.</p>
  }

  return (
    <div className="rounded-[--radius-lg] overflow-hidden">
      {editable && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="scene-editor-content"
      />
      {editable && <Footer />}
    </div>
  )
}

// ─── Toolbar ────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const currentLevel = [1, 2, 3].find((level) =>
    editor.isActive('heading', { level })
  )
  const isSmallText = editor.isActive('textStyle', { fontSize: '0.85em' })
  const headingValue = currentLevel ? `h${currentLevel}` : isSmallText ? 'small' : 'normal'

  const handleHeadingChange = (value: string) => {
    if (value === 'normal') {
      editor.chain().focus().setParagraph().unsetAllMarks().run()
    } else if (value === 'small') {
      editor.chain().focus().setParagraph().setMark('textStyle', { fontSize: '0.85em' }).run()
    } else {
      const level = parseInt(value.replace('h', '')) as 1 | 2 | 3
      editor.chain().focus().toggleHeading({ level }).run()
    }
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-bg-base flex-wrap">
      {/* Text style dropdown */}
      <select
        value={headingValue}
        onChange={(e) => handleHeadingChange(e.target.value)}
        className="bg-bg-raised text-text-body border border-border rounded-[--radius-sm] px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-border-active"
      >
        <option value="normal">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="small">Small</option>
      </select>

      <Divider />

      {/* Bold */}
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <span className="font-bold text-sm">B</span>
      </ToolbarButton>

      {/* Italic */}
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <span className="italic text-sm">I</span>
      </ToolbarButton>

      {/* Highlight */}
      <ToolbarButton
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight (Ctrl+Shift+H)"
        className="text-primary-light"
      >
        <span className="bg-primary-light/25 px-1 rounded-sm text-sm">A</span>
      </ToolbarButton>

      <Divider />

      {/* Bullet list */}
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List (Ctrl+Shift+8)"
      >
        <span className="text-base leading-none">&bull;</span>
      </ToolbarButton>

      {/* Numbered list */}
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List (Ctrl+Shift+7)"
      >
        <span className="text-xs">1.</span>
      </ToolbarButton>

      <Divider />

      {/* Blockquote (read-aloud) */}
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Read-Aloud Block (Ctrl+Shift+B)"
        className="text-primary"
      >
        <span className="border-l-2 border-primary pl-1.5 italic text-xs">&ldquo;</span>
      </ToolbarButton>

      {/* Horizontal rule */}
      <ToolbarButton
        active={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <span className="text-xs">&mdash;</span>
      </ToolbarButton>
    </div>
  )
}

// ─── Toolbar Button ─────────────────────────────────────

function ToolbarButton({
  active,
  onClick,
  title,
  className = '',
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        w-7 h-7 rounded-[--radius-sm] flex items-center justify-center cursor-pointer
        transition-colors duration-[--duration-fast]
        ${active
          ? 'bg-primary/15 border border-primary/30 text-primary-light'
          : `border border-transparent text-text-body hover:bg-bg-raised ${className}`
        }
      `}
    >
      {children}
    </button>
  )
}

// ─── Divider ────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5" />
}

// ─── Footer ─────────────────────────────────────────────

function Footer() {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
  const mod = isMac ? 'Cmd' : 'Ctrl'

  return (
    <div className="px-3 py-1.5 border-t border-border bg-bg-base">
      <span className="text-[10px] text-text-muted">
        {mod}+B bold &middot; {mod}+I italic &middot; {mod}+Shift+H highlight
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Add editor CSS styles**

Add the following to `app/src/index.css` (at the end of the file, after existing custom styles). These styles target Tiptap's editor content area to match the warm craft aesthetic:

```css
/* ─── Scene Editor (Tiptap) ─── */

.scene-editor-content .tiptap {
  padding: 12px 16px;
  min-height: 120px;
  outline: none;
  font-family: var(--font-body), Georgia, serif;
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-text-body);
}

.scene-editor-content .tiptap:focus {
  outline: none;
}

.scene-editor-content .tiptap h1 {
  font-size: 1.25rem;
  color: var(--color-text-heading);
  font-weight: 600;
  margin-bottom: 0.75rem;
  margin-top: 1rem;
}

.scene-editor-content .tiptap h1:first-child {
  margin-top: 0;
}

.scene-editor-content .tiptap h2 {
  font-size: 1.125rem;
  color: var(--color-text-heading);
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 0.75rem;
}

.scene-editor-content .tiptap h3 {
  font-size: 1rem;
  color: var(--color-text-heading);
  font-weight: 500;
  margin-bottom: 0.5rem;
  margin-top: 0.75rem;
}

.scene-editor-content .tiptap p {
  margin-bottom: 0.5rem;
}

.scene-editor-content .tiptap strong {
  color: var(--color-text-heading);
  font-weight: 600;
}

.scene-editor-content .tiptap ul {
  list-style-type: disc;
  list-style-position: inside;
  margin-bottom: 0.5rem;
}

.scene-editor-content .tiptap ol {
  list-style-type: decimal;
  list-style-position: inside;
  margin-bottom: 0.5rem;
}

.scene-editor-content .tiptap li {
  color: var(--color-text-body);
}

.scene-editor-content .tiptap li + li {
  margin-top: 0.25rem;
}

.scene-editor-content .tiptap blockquote {
  border-left: 3px solid var(--color-primary);
  padding-left: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  background: var(--color-primary-ghost);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-style: italic;
  color: var(--color-text-heading);
}

.scene-editor-content .tiptap hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1rem 0;
}

.scene-editor-content .tiptap mark {
  background: oklch(0.82 0.12 85 / 0.25);
  border-radius: 3px;
  padding: 1px 4px;
  color: inherit;
}

.scene-editor-content .tiptap code {
  background: var(--color-bg-raised);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: var(--font-mono), monospace;
  color: var(--color-primary-light);
}

.scene-editor-content .tiptap p.is-editor-empty:first-child::before {
  content: 'Write your scene content...';
  color: var(--color-text-muted);
  font-style: italic;
  pointer-events: none;
  float: left;
  height: 0;
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/timeline/SceneEditor.tsx app/src/index.css
git commit -m "feat: add SceneEditor component with toolbar and warm craft styling"
```

---

### Task 4: Integrate SceneEditor into SceneBlock

**Files:**
- Modify: `app/src/features/timeline/SceneBlock.tsx:1-188`

Replace the textarea with `SceneEditor`. The edit/save/cancel flow stays the same — `SceneEditor` calls `onChange` which updates local state, and Save persists it.

- [ ] **Step 1: Update imports in SceneBlock.tsx**

Replace the `MarkdownPreview` import and add `SceneEditor`:

In `app/src/features/timeline/SceneBlock.tsx`, replace:
```typescript
import { MarkdownPreview } from './MarkdownPreview'
```

With:
```typescript
import { SceneEditor } from './SceneEditor'
```

- [ ] **Step 2: Remove textarea-related refs and handlers**

In `app/src/features/timeline/SceneBlock.tsx`, remove the `textareaRef` and the textarea auto-resize logic.

Remove this line:
```typescript
  const textareaRef = useRef<HTMLTextAreaElement>(null)
```

Remove this entire useEffect:
```typescript
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing])
```

Replace the `handleContentChange` function:
```typescript
  const handleContentChange = (value: string) => {
    setEditContent(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }
```

With:
```typescript
  const handleContentChange = (value: string) => {
    setEditContent(value)
  }
```

- [ ] **Step 3: Replace the scene content area**

In `app/src/features/timeline/SceneBlock.tsx`, replace the scene content section (lines 167-185):

```tsx
      {/* Scene content */}
      <div className="px-4 py-3">
        {editing && isPrep ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write your scene content in markdown...&#10;&#10;Use > for read-aloud text:&#10;> You enter a dimly lit tavern..."
              className="w-full bg-bg-raised rounded-[--radius-md] border border-border p-3 text-sm text-text-body font-mono leading-relaxed resize-none focus:outline-none focus:border-border-active transition-colors min-h-[120px]"
            />
            <p className="text-[10px] text-text-muted">
              Markdown supported. Use <code className="bg-bg-raised px-1 rounded">&gt;</code> for read-aloud text.
            </p>
          </div>
        ) : (
          <MarkdownPreview content={displayContent} />
        )}
      </div>
```

With:
```tsx
      {/* Scene content */}
      <div className="px-4 py-3">
        <SceneEditor
          content={editing && isPrep ? editContent : displayContent}
          editable={editing && isPrep}
          onChange={handleContentChange}
        />
      </div>
```

- [ ] **Step 4: Clean up unused import**

Remove `useRef` from the React import if it's no longer used (check if `lastSavedContent` still uses it — it does, so keep `useRef` but you can remove the `useEffect` import if the textarea focus effect was the only one... actually `useEffect` is still used for the Prep→Play auto-save and the lastSavedContent cleanup, so keep it).

Remove the unused `useEffect` import only if all useEffect calls were removed. In this case, two useEffect calls remain (lines 66-74 and 85-89), so **keep the import as-is**.

- [ ] **Step 5: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/timeline/SceneBlock.tsx
git commit -m "feat: replace markdown textarea with tiptap rich text editor in SceneBlock"
```

---

### Task 5: Manual Testing & Polish

**Files:**
- Possibly modify: `app/src/features/timeline/SceneEditor.tsx`, `app/src/features/timeline/useSceneEditor.ts`, `app/src/index.css`

- [ ] **Step 1: Start the dev server**

```bash
cd app && npm run dev
```

- [ ] **Step 2: Test new scene creation**

1. Navigate to a session timeline
2. Click "+ Scene" to create a new scene
3. Click "Edit" on the new scene
4. Verify the toolbar appears with all buttons
5. Type text, apply bold (toolbar button AND Ctrl/Cmd+B)
6. Apply italic, highlight, heading changes via dropdown
7. Create a bullet list, numbered list
8. Add a read-aloud blockquote — verify amber styling
9. Add a horizontal rule
10. Click Save — verify content persists
11. Switch to Play mode — verify toolbar disappears and content renders identically

- [ ] **Step 3: Test existing markdown scene**

1. Open a scene that has existing markdown content
2. Verify it renders correctly (headings, bold, italic, blockquotes all styled properly)
3. Click Edit — verify the content loads into the editor properly
4. Make a small change and Save
5. Verify the scene now saves as JSON and renders correctly
6. Refresh the page — verify the JSON content loads correctly

- [ ] **Step 4: Test keyboard shortcuts**

Verify each shortcut while the editor is focused:
- Cmd/Ctrl+B → bold
- Cmd/Ctrl+I → italic
- Cmd/Ctrl+Shift+H → highlight
- Cmd/Ctrl+1/2/3 → headings
- Cmd/Ctrl+0 → normal text
- Cmd/Ctrl+Shift+8 → bullet list
- Cmd/Ctrl+Shift+7 → numbered list
- Cmd/Ctrl+Shift+B → blockquote

- [ ] **Step 5: Test edge cases**

1. Prep→Play mode switch while editing (should auto-save)
2. Cancel while editing (should discard changes)
3. Empty scene display in read-only mode ("Empty scene" message)
4. Drag-and-drop reordering still works with the new editor

- [ ] **Step 6: Fix any issues found**

Address styling or behavior issues discovered during testing.

- [ ] **Step 7: Run type check and build**

```bash
cd app && npx tsc --noEmit && npx vite build
```

Expected: Clean type check and successful build.

- [ ] **Step 8: Commit any fixes**

```bash
git add app/src/features/timeline/SceneEditor.tsx app/src/features/timeline/useSceneEditor.ts app/src/features/timeline/SceneBlock.tsx app/src/index.css
git commit -m "fix: polish rich text editor after manual testing"
```

(Skip this step if no fixes were needed.)

---

### Task 6: Final Type Check and Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Full type check**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Production build**

```bash
cd app && npx vite build
```

Expected: Successful build with no errors.

- [ ] **Step 3: Verify build output**

```bash
ls -la app/dist/
```

Expected: Build artifacts present.
