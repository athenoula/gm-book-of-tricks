import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

type Article = { headline: string; body: string }

export function BroadsheetTemplate({ content, style }: Props) {
  const font = style.font_family || "'IM Fell English', serif"
  const size = style.font_size || 14
  const articles = (content.articles ?? []) as Article[]

  return (
    <ParchmentBase template="broadsheet">
      <div className="absolute top-1/2 left-0 right-0 h-px bg-current/10 pointer-events-none z-[2]" />

      {content.masthead && (
        <div className="text-center border-b-2 border-current/30 pb-2 mb-1">
          <div className="text-3xl font-bold tracking-wide" style={{ fontFamily: "'UnifrakturMaguntia', serif", fontSize: size * 2.2 }}>
            {content.masthead as string}
          </div>
        </div>
      )}

      {content.date && (
        <div className="text-center text-xs mb-3 opacity-60 border-b border-current/20 pb-1" style={{ fontFamily: font }}>
          {content.date as string}
        </div>
      )}

      {content.headline && (
        <div className="text-center mb-4" style={{ fontFamily: font, fontSize: size * 1.6, fontWeight: 700, lineHeight: 1.2 }}>
          {content.headline as string}
        </div>
      )}

      <div className={articles.length > 1 ? 'columns-2 gap-4' : ''} style={{ fontFamily: font, fontSize: size }}>
        {articles.map((article, i) => (
          <div key={i} className="mb-3 break-inside-avoid">
            <div className="font-bold mb-1 text-sm" style={{ fontSize: size * 1.1 }}>{article.headline}</div>
            <div className="leading-relaxed whitespace-pre-line" style={{ fontSize: size * 0.9 }}>{article.body}</div>
          </div>
        ))}
      </div>

      {content.ads && (
        <div className="mt-4 pt-2 border-t border-current/20 text-center text-xs opacity-60" style={{ fontFamily: font, fontSize: size * 0.75 }}>
          {content.ads as string}
        </div>
      )}
    </ParchmentBase>
  )
}
