import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function InvitationTemplate({ content, style }: Props) {
  const font = style.font_family || "'Pinyon Script', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="invitation">
      <div className="absolute inset-5 border border-amber-700/30 pointer-events-none z-[2]" />
      <div className="absolute inset-7 border border-amber-700/15 pointer-events-none z-[2]" />
      {[
        { top: 16, left: 16 }, { top: 16, right: 16 },
        { bottom: 16, left: 16 }, { bottom: 16, right: 16 },
      ].map((pos, i) => (
        <div key={i} className="absolute text-amber-700/40 text-lg z-[2]" style={pos as React.CSSProperties}>
          ✦
        </div>
      ))}

      <div className="text-center py-4" style={{ fontFamily: font }}>
        {content.host_line && (
          <div className="mb-4 text-sm opacity-70" style={{ fontSize: size * 0.85 }}>
            {content.host_line as string}
          </div>
        )}

        <div className="mb-1 text-xs uppercase tracking-[3px] opacity-50">{(content.subtitle as string) || 'cordially invites you to'}</div>

        {content.event_title && (
          <div className="my-4" style={{ fontSize: size * 1.8, fontWeight: 700, lineHeight: 1.2 }}>
            {content.event_title as string}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 my-4 opacity-30">
          <div className="h-px w-16 bg-current" />
          <div className="text-xs">✦</div>
          <div className="h-px w-16 bg-current" />
        </div>

        {content.details && (
          <div className="mb-4" style={{ fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {content.details as string}
          </div>
        )}

        {content.rsvp && (
          <div className="mt-6 text-sm opacity-70" style={{ fontSize: size * 0.85 }}>
            {content.rsvp as string}
          </div>
        )}
      </div>
    </ParchmentBase>
  )
}
