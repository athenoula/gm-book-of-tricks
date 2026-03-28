import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function DecreeTemplate({ content, style }: Props) {
  const font = style.font_family || "'IM Fell English', serif"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="decree">
      <div className="absolute inset-4 border border-current/20 pointer-events-none z-[2]" />
      <div className="absolute inset-6 border border-current/10 pointer-events-none z-[2]" />

      <div className="text-center" style={{ fontFamily: font }}>
        {content.title && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[4px] mb-2 opacity-60">By Royal Decree</div>
            <div className="text-2xl font-bold" style={{ fontSize: size * 1.6 }}>
              {content.title as string}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 opacity-40">
              <div className="h-px w-12 bg-current" />
              <div className="text-xs">✦</div>
              <div className="h-px w-12 bg-current" />
            </div>
          </div>
        )}

        {content.body && (
          <div className="text-left mb-6" style={{ fontFamily: font, fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {content.body as string}
          </div>
        )}

        <div className="mt-8 flex justify-between items-end">
          {content.signature_line && (
            <div className="text-left">
              <div className="border-t border-current/40 pt-1 min-w-[160px]" style={{ fontFamily: font, fontSize: size * 0.9 }}>
                {content.signature_line as string}
              </div>
            </div>
          )}
          {content.date && (
            <div className="text-right text-sm opacity-60" style={{ fontSize: size * 0.8 }}>
              {content.date as string}
            </div>
          )}
        </div>
      </div>
    </ParchmentBase>
  )
}
