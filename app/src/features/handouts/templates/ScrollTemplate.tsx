import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function ScrollTemplate({ content, style }: Props) {
  const font = style.font_family || "'Pinyon Script', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="scroll">
      {/* Rolled edge top */}
      <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(to bottom, rgba(80,40,10,0.25), transparent)' }} />

      {content.title && (
        <div className="text-center mb-6" style={{ fontFamily: font, fontSize: size * 1.4, fontWeight: 700 }}>
          {content.title as string}
        </div>
      )}

      {content.body && (
        <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {content.body as string}
        </div>
      )}

      {content.signature && (
        <div className="mt-6 text-right" style={{ fontFamily: font, fontSize: size, fontStyle: 'italic' }}>
          — {content.signature as string}
        </div>
      )}

      {/* Rolled edge bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-[2]"
        style={{ background: 'linear-gradient(to top, rgba(80,40,10,0.25), transparent)' }} />
    </ParchmentBase>
  )
}
