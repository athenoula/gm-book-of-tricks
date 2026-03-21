import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { MarkdownPreview } from './MarkdownPreview'
import { useUpdateScene, useDeleteScene } from './useScenes'
import type { Scene } from './useScenes'

const STATUS_CYCLE: Record<Scene['status'], Scene['status']> = {
  upcoming: 'active',
  active: 'done',
  done: 'upcoming',
}

const STATUS_STYLES: Record<Scene['status'], { label: string; className: string; dot: string }> = {
  upcoming: { label: 'Upcoming', className: 'text-text-muted', dot: 'bg-text-muted' },
  active: { label: 'Active', className: 'text-success', dot: 'bg-success' },
  done: { label: 'Done', className: 'text-text-muted line-through', dot: 'bg-text-muted/50' },
}

interface Props {
  scene: Scene
  isPrep: boolean
  dragHandleProps?: Record<string, unknown>
}

export function SceneBlock({ scene, isPrep, dragHandleProps }: Props) {
  const [editing, setEditing] = useState(false)
  // Local edit state — only used while editing
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  // Track what we last saved so we can show it immediately
  const lastSavedContent = useRef<string | null>(null)
  const updateScene = useUpdateScene()
  const deleteScene = useDeleteScene()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const status = STATUS_STYLES[scene.status]

  const handleStatusCycle = () => {
    updateScene.mutate({ id: scene.id, status: STATUS_CYCLE[scene.status] })
  }

  const handleStartEdit = () => {
    setEditName(scene.name)
    setEditContent(scene.content || lastSavedContent.current || '')
    setEditing(true)
  }

  const handleSave = () => {
    // Store what we're saving so we can display it immediately
    lastSavedContent.current = editContent
    updateScene.mutate(
      { id: scene.id, name: editName, content: editContent },
      {
        onSuccess: () => {
          setEditing(false)
        },
      }
    )
  }

  const handleCancel = () => {
    setEditing(false)
  }

  // If we switch to Play while editing, save first
  useEffect(() => {
    if (!isPrep && editing) {
      lastSavedContent.current = editContent
      updateScene.mutate(
        { id: scene.id, name: editName, content: editContent },
        { onSuccess: () => setEditing(false) }
      )
    }
  }, [isPrep]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing])

  // Clear the lastSaved ref once the real data catches up
  useEffect(() => {
    if (scene.content && lastSavedContent.current && scene.content === lastSavedContent.current) {
      lastSavedContent.current = null
    }
  }, [scene.content])

  const handleDelete = () => {
    if (window.confirm(`Delete "${scene.name}"?`)) {
      deleteScene.mutate({ id: scene.id, sessionId: scene.session_id })
    }
  }

  const handleContentChange = (value: string) => {
    setEditContent(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  // What to display: editing state > last saved (optimistic) > DB data
  const displayContent = editing
    ? editContent
    : (lastSavedContent.current || scene.content)

  return (
    <div className={`bg-bg-base rounded-[--radius-lg] border border-border overflow-hidden ${scene.status === 'done' ? 'opacity-60' : ''}`}>
      {/* Scene header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {isPrep && (
          <span
            {...dragHandleProps}
            className="text-text-muted cursor-grab active:cursor-grabbing select-none"
          >
            ⠿
          </span>
        )}

        <button
          onClick={handleStatusCycle}
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer transition-colors ${status.dot} max-md:p-2 max-md:min-w-[44px] max-md:min-h-[44px] max-md:flex max-md:items-center max-md:justify-center`}
          title={`Status: ${status.label} (click to cycle)`}
        />

        {editing && isPrep ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 bg-transparent text-text-heading font-medium outline-none border-b border-border-hover focus:border-primary text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        ) : (
          <span className={`flex-1 text-sm font-medium ${status.className}`}>
            {scene.name}
          </span>
        )}

        {isPrep && (
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateScene.isPending}>
                  {updateScene.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete} className="text-danger hover:text-danger">
                  ✕
                </Button>
              </>
            )}
          </div>
        )}
      </div>

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
    </div>
  )
}
