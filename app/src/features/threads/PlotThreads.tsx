import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useThreads, useCreateThread, useUpdateThread, useDeleteThread } from './useThreads'
import type { PlotThread } from './useThreads'

interface Props {
  campaignId: string
}

export function PlotThreads({ campaignId }: Props) {
  const { data: threads, isLoading } = useThreads(campaignId)
  const createThread = useCreateThread()
  const updateThread = useUpdateThread()
  const deleteThread = useDeleteThread()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const openThreads = threads?.filter((t) => t.status === 'open') ?? []
  const resolvedThreads = threads?.filter((t) => t.status === 'resolved') ?? []

  const handleAdd = () => {
    if (!newTitle.trim()) return
    const maxSort = threads ? Math.max(0, ...threads.map((t) => t.sort_order)) + 1 : 0
    createThread.mutate({
      campaign_id: campaignId,
      title: newTitle.trim(),
      note: newNote.trim() || undefined,
      sort_order: maxSort,
    })
    setNewTitle('')
    setNewNote('')
    setShowAddForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      setShowAddForm(false)
      setNewTitle('')
      setNewNote('')
    }
  }

  const handleToggleStatus = (thread: PlotThread) => {
    updateThread.mutate({
      id: thread.id,
      status: thread.status === 'open' ? 'resolved' : 'open',
    })
  }

  const handleDelete = (thread: PlotThread) => {
    if (window.confirm(`Delete "${thread.title}"?`)) {
      deleteThread.mutate({ id: thread.id, campaignId })
    }
  }

  if (isLoading) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl">Plot Threads</h3>
        <Button size="sm" onClick={() => {
          setShowAddForm(true)
          requestAnimationFrame(() => titleInputRef.current?.focus())
        }}>
          + Add Thread
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-4 mb-3">
          <input
            ref={titleInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Thread title..."
            className="w-full bg-transparent text-text-heading text-sm font-medium outline-none border-b border-border-hover focus:border-primary pb-1 mb-2"
          />
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Note (optional)..."
            className="w-full bg-transparent text-text-secondary text-xs outline-none resize-none min-h-[40px]"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewTitle(''); setNewNote('') }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Open threads */}
      {openThreads.length === 0 && !showAddForm && (
        <p className="text-text-muted text-sm py-4 text-center">No open plot threads</p>
      )}

      <div className="space-y-2">
        {openThreads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onUpdate={(updates) => updateThread.mutate({ id: thread.id, ...updates })}
          />
        ))}
      </div>

      {/* Resolved section */}
      {resolvedThreads.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1.5 text-text-muted text-xs cursor-pointer hover:text-text-secondary transition-colors"
          >
            <span>{showResolved ? '▾' : '▸'}</span>
            Resolved ({resolvedThreads.length})
          </button>

          {showResolved && (
            <div className="space-y-2 mt-2 opacity-60">
              {resolvedThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  onUpdate={(updates) => updateThread.mutate({ id: thread.id, ...updates })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Thread Item ────────────────────────────────────────

function ThreadItem({
  thread,
  onToggleStatus,
  onDelete,
  onUpdate,
}: {
  thread: PlotThread
  onToggleStatus: (t: PlotThread) => void
  onDelete: (t: PlotThread) => void
  onUpdate: (updates: { title?: string; note?: string | null }) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [titleValue, setTitleValue] = useState(thread.title)
  const [noteValue, setNoteValue] = useState(thread.note || '')

  const handleTitleBlur = () => {
    setEditingTitle(false)
    if (titleValue.trim() && titleValue !== thread.title) {
      onUpdate({ title: titleValue.trim() })
    } else {
      setTitleValue(thread.title)
    }
  }

  const handleNoteBlur = () => {
    setEditingNote(false)
    const newNote = noteValue.trim() || null
    if (newNote !== thread.note) {
      onUpdate({ note: newNote })
    }
  }

  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border border-l-3 border-l-primary px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Checkbox */}
        <button
          onClick={() => onToggleStatus(thread)}
          className={`w-4 h-4 rounded-[3px] border-2 shrink-0 cursor-pointer transition-colors ${
            thread.status === 'resolved'
              ? 'bg-primary border-primary'
              : 'border-primary hover:bg-primary/20'
          }`}
          title={thread.status === 'open' ? 'Mark resolved' : 'Reopen'}
        >
          {thread.status === 'resolved' && (
            <span className="text-[10px] text-text-inverse flex items-center justify-center">✓</span>
          )}
        </button>

        {/* Title */}
        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setTitleValue(thread.title); setEditingTitle(false) } }}
            className="flex-1 bg-transparent text-text-heading text-sm font-medium outline-none border-b border-border-hover focus:border-primary"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            className={`flex-1 text-sm font-medium cursor-text ${
              thread.status === 'resolved' ? 'text-text-muted line-through' : 'text-text-heading'
            }`}
          >
            {thread.title}
          </span>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(thread)}
          className="text-text-muted hover:text-danger text-sm cursor-pointer transition-colors shrink-0"
        >
          ×
        </button>
      </div>

      {/* Note */}
      {(thread.note || editingNote) && (
        <div className="ml-6 mt-1">
          {editingNote ? (
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={handleNoteBlur}
              onKeyDown={(e) => { if (e.key === 'Escape') { setNoteValue(thread.note || ''); setEditingNote(false) } }}
              className="w-full bg-transparent text-text-secondary text-xs outline-none resize-none min-h-[30px]"
              autoFocus
            />
          ) : (
            <p
              onClick={() => { setNoteValue(thread.note || ''); setEditingNote(true) }}
              className="text-xs text-text-secondary cursor-text"
            >
              {thread.note}
            </p>
          )}
        </div>
      )}

      {/* Add note link (if no note exists) */}
      {!thread.note && !editingNote && (
        <button
          onClick={() => setEditingNote(true)}
          className="ml-6 mt-1 text-[10px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
        >
          + add note
        </button>
      )}
    </div>
  )
}
