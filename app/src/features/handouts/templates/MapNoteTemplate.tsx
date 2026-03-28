import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
  imageUrl: string | null
}

export function MapNoteTemplate({ content, style, imageUrl }: Props) {
  const font = style.font_family || "'Caveat', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="map_note">
      <div className="absolute top-16 right-8 w-24 h-24 rounded-full pointer-events-none z-[2]"
        style={{ background: 'radial-gradient(circle, rgba(101,67,33,0.15) 0%, transparent 70%)' }} />

      {imageUrl && (
        <div className="mb-4 rounded overflow-hidden border border-current/20">
          <img src={imageUrl} alt="" className="w-full object-contain max-h-64" />
        </div>
      )}

      {!imageUrl && (
        <div className="mb-4 h-48 border border-dashed border-current/30 rounded flex items-center justify-center">
          <span className="text-sm opacity-40">Upload a map image</span>
        </div>
      )}

      {content.caption && (
        <div className="text-center mb-3" style={{ fontFamily: font, fontSize: size * 1.2, fontWeight: 700 }}>
          {content.caption as string}
        </div>
      )}

      {content.annotations && (
        <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {content.annotations as string}
        </div>
      )}
    </ParchmentBase>
  )
}
