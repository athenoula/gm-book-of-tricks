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
