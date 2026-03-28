import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
  imageUrl: string | null
}

export function WantedTemplate({ content, style, imageUrl }: Props) {
  const font = style.font_family || "'Rye', serif"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="wanted">
      {/* Tack holes */}
      {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
        <div key={i} className="absolute w-3 h-3 rounded-full z-[2]"
          style={{ ...pos, background: 'radial-gradient(circle, #555 30%, transparent 70%)' } as React.CSSProperties} />
      ))}

      <div className="text-center" style={{ fontFamily: font }}>
        <div className="text-4xl font-bold tracking-wider mb-4" style={{ fontSize: size * 2.5 }}>
          {(content.heading as string) || 'WANTED'}
        </div>

        <div className="mx-auto mb-4 w-40 h-40 border-2 border-current flex items-center justify-center overflow-hidden"
          style={{ opacity: 0.8 }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm opacity-50">Portrait</span>
          )}
        </div>

        {content.name && (
          <div className="text-xl font-bold mb-2" style={{ fontSize: size * 1.4 }}>
            {content.name as string}
          </div>
        )}

        {content.description && (
          <div className="mb-4 text-sm" style={{ fontSize: size * 0.85 }}>
            {content.description as string}
          </div>
        )}

        {content.reward && (
          <div className="mt-4 pt-3 border-t border-current/30">
            <div className="text-xs uppercase tracking-wider mb-1">{(content.reward_label as string) || 'Reward'}</div>
            <div className="text-2xl font-bold" style={{ fontSize: size * 1.6 }}>
              {content.reward as string}
            </div>
          </div>
        )}
      </div>
    </ParchmentBase>
  )
}
