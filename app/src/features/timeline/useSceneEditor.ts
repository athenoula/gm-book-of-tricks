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
