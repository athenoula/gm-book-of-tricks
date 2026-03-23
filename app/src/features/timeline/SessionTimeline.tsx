import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiBookshelf, GiScrollUnfurled } from '@/components/ui/icons'
import { useScenes, useCreateScene, useReorderScenes } from './useScenes'
import { useTimelineBlocks, useAddTimelineBlock, useReorderTimelineBlocks } from './useTimelineBlocks'
import { SceneBlock } from './SceneBlock'
import { TimelineBlockCard } from './TimelineBlockCard'
import { ContentDrawer } from './ContentDrawer'

interface Props {
  sessionId: string
  campaignId: string
}

// Unified timeline item type
type TimelineItem =
  | { kind: 'scene'; id: string; sort_order: number; data: ReturnType<typeof useScenes>['data'] extends (infer T)[] | undefined ? T : never }
  | { kind: 'block'; id: string; sort_order: number; data: ReturnType<typeof useTimelineBlocks>['data'] extends (infer T)[] | undefined ? T : never }

export function SessionTimeline({ sessionId, campaignId }: Props) {
  const { data: scenes, isLoading: loadingScenes } = useScenes(sessionId)
  const { data: blocks, isLoading: loadingBlocks } = useTimelineBlocks(sessionId)
  const createScene = useCreateScene()
  const reorderScenes = useReorderScenes()
  const addBlock = useAddTimelineBlock()
  const reorderBlocks = useReorderTimelineBlocks()
  const [showLibrary, setShowLibrary] = useState(false)
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null)

  const handlePin = (itemId: string) => {
    setPinnedItemId((prev) => (prev === itemId ? null : itemId))
  }

  // Merge scenes and blocks into a unified sorted list
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []
    if (scenes) {
      for (const s of scenes) {
        items.push({ kind: 'scene', id: `scene-${s.id}`, sort_order: s.sort_order, data: s })
      }
    }
    if (blocks) {
      for (const b of blocks) {
        items.push({ kind: 'block', id: `block-${b.id}`, sort_order: b.sort_order, data: b })
      }
    }
    items.sort((a, b) => a.sort_order - b.sort_order)
    return items
  }, [scenes, blocks])

  const nextSortOrder = timeline.length > 0
    ? Math.max(...timeline.map((t) => t.sort_order)) + 1
    : 0

  const handleAddScene = () => {
    createScene.mutate({
      session_id: sessionId,
      campaign_id: campaignId,
      sort_order: nextSortOrder,
    })
  }

  const handleAddToTimeline = (item: {
    block_type: string
    source_id: string
    title: string
    content_snapshot: Record<string, unknown>
  }) => {
    addBlock.mutate({
      session_id: sessionId,
      campaign_id: campaignId,
      block_type: item.block_type as 'monster' | 'npc' | 'spell' | 'location' | 'battle' | 'note' | 'scene',
      source_id: item.source_id || undefined,
      title: item.title,
      content_snapshot: item.content_snapshot,
      sort_order: nextSortOrder,
    })
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = [...timeline]
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)

    // Update sort orders for both scenes and blocks
    const sceneUpdates: { id: string; sort_order: number }[] = []
    const blockUpdates: { id: string; sort_order: number }[] = []

    items.forEach((item, index) => {
      if (item.kind === 'scene') {
        sceneUpdates.push({ id: item.data.id, sort_order: index })
      } else {
        blockUpdates.push({ id: item.data.id, sort_order: index })
      }
    })

    if (sceneUpdates.length > 0) {
      reorderScenes.mutate({ scenes: sceneUpdates, sessionId })
    }
    if (blockUpdates.length > 0) {
      reorderBlocks.mutate({ blocks: blockUpdates, sessionId })
    }
  }

  const isLoading = loadingScenes || loadingBlocks

  if (isLoading) {
    return <p className="text-text-muted text-sm py-4">Loading timeline...</p>
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex gap-2 max-md:hidden">
          <Button
            size="sm"
            variant={showLibrary ? 'primary' : 'secondary'}
            onClick={() => setShowLibrary(!showLibrary)}
          >
            <GameIcon icon={GiBookshelf} size="sm" /> {showLibrary ? 'Hide' : 'Library'}
          </Button>
          <Button size="sm" onClick={handleAddScene} disabled={createScene.isPending}>
            + Scene
          </Button>
        </div>
      </div>

      {/* Mobile action buttons */}
      <div className="flex gap-2 mb-4 md:hidden">
        <Button size="sm" variant="secondary" onClick={() => setShowLibrary(!showLibrary)} className="flex-1">
          <GameIcon icon={GiBookshelf} size="sm" /> Library
        </Button>
        <Button size="sm" onClick={handleAddScene} disabled={createScene.isPending} className="flex-1">
          + Scene
        </Button>
      </div>

      {/* Layout: timeline + optional library sidebar */}
      <div className={showLibrary ? 'grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4' : ''}>
        <div>
          {/* Empty state */}
          {timeline.length === 0 ? (
            <div className="bg-bg-base rounded-[--radius-lg] border border-border p-10 text-center">
              <div className="text-3xl mb-3"><GameIcon icon={GiScrollUnfurled} size="3xl" /></div>
              <h3 className="text-lg mb-2">Empty Timeline</h3>
              <p className="text-text-secondary text-sm mb-4">
                Add scenes and content to build your session plan.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleAddScene}>Add Scene</Button>
                <Button variant="secondary" onClick={() => setShowLibrary(true)}>Open Library</Button>
              </div>
            </div>
          ) : (
            <>
            {/* Pinned item */}
            {pinnedItemId && (() => {
              const pinned = timeline.find((item) => {
                const id = item.data.id
                return id === pinnedItemId
              })
              if (!pinned) return null
              return (
                <div className="mb-3 relative">
                  <div className="absolute -top-2 left-3 bg-primary text-text-inverse text-[10px] px-2 py-0.5 rounded-full font-medium z-10">
                    Pinned
                  </div>
                  {pinned.kind === 'scene' ? (
                    <SceneBlock
                      scene={pinned.data}
                      dragHandleProps={undefined}
                      isPinned={true}
                      onPin={() => handlePin(pinned.data.id)}
                    />
                  ) : (
                    <TimelineBlockCard
                      block={pinned.data}
                      dragHandleProps={undefined}
                      isPinned={true}
                      onPin={() => handlePin(pinned.data.id)}
                    />
                  )}
                </div>
              )
            })()}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="timeline">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {timeline.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            {item.kind === 'scene' ? (
                              <SceneBlock
                                scene={item.data}
                                dragHandleProps={provided.dragHandleProps ?? undefined}
                                onPin={() => handlePin(item.data.id)}
                                isPinned={pinnedItemId === item.data.id}
                              />
                            ) : (
                              <TimelineBlockCard
                                block={item.data}
                                dragHandleProps={provided.dragHandleProps ?? undefined}
                                onPin={() => handlePin(item.data.id)}
                                isPinned={pinnedItemId === item.data.id}
                              />
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            </>
          )}
        </div>

        {/* Library sidebar */}
        {showLibrary && (
          <div className="max-md:mt-4">
            <ContentDrawer
              campaignId={campaignId}
              sessionId={sessionId}
              onAddToTimeline={handleAddToTimeline}
              onClose={() => setShowLibrary(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
