import { useRef, useCallback } from 'react'
import type { Handout } from '@/lib/types'
import { WaxSeal } from './WaxSeal'
import { ScrollTemplate } from './templates/ScrollTemplate'
import { WantedTemplate } from './templates/WantedTemplate'
import { DecreeTemplate } from './templates/DecreeTemplate'
import { MapNoteTemplate } from './templates/MapNoteTemplate'
import { TavernTemplate } from './templates/TavernTemplate'
import { BroadsheetTemplate } from './templates/BroadsheetTemplate'
import { InvitationTemplate } from './templates/InvitationTemplate'
import { BlankTemplate } from './templates/BlankTemplate'

interface Props {
  template: Handout['template']
  content: Record<string, unknown>
  style: Handout['style']
  seal: Handout['seal']
  imageUrl: string | null
  onSealMove?: (position: { x: number; y: number }) => void
  previewRef?: React.RefObject<HTMLDivElement | null>
}

export function HandoutPreview({ template, content, style, seal, imageUrl, onSealMove, previewRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = previewRef ?? containerRef

  const handleSealDrag = useCallback((e: React.DragEvent) => {
    if (!onSealMove || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onSealMove({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }, [onSealMove, ref])

  const renderTemplate = () => {
    switch (template) {
      case 'scroll': return <ScrollTemplate content={content} style={style} />
      case 'wanted': return <WantedTemplate content={content} style={style} imageUrl={imageUrl} />
      case 'decree': return <DecreeTemplate content={content} style={style} />
      case 'map_note': return <MapNoteTemplate content={content} style={style} imageUrl={imageUrl} />
      case 'tavern': return <TavernTemplate content={content} style={style} />
      case 'broadsheet': return <BroadsheetTemplate content={content} style={style} />
      case 'invitation': return <InvitationTemplate content={content} style={style} />
      case 'blank': return <BlankTemplate content={content} style={style} />
    }
  }

  return (
    <div
      ref={ref}
      className="relative w-[400px] max-w-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleSealDrag}
    >
      {renderTemplate()}

      {seal && (
        <div
          draggable
          onDragEnd={handleSealDrag}
          className="absolute cursor-grab active:cursor-grabbing"
          style={{
            left: `${seal.position.x}%`,
            top: `${seal.position.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        >
          <WaxSeal seal={seal} size={72} draggable />
          <div className="text-center mt-1 text-[9px] text-text-muted select-none">drag to move</div>
        </div>
      )}
    </div>
  )
}
