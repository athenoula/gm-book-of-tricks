import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

type MenuSection = { name: string; items: { name: string; price: string }[] }

export function TavernTemplate({ content, style }: Props) {
  const font = style.font_family || "'Special Elite', monospace"
  const size = style.font_size || 16
  const sections = (content.sections ?? []) as MenuSection[]

  return (
    <ParchmentBase template="tavern">
      {content.establishment_name && (
        <div className="text-center mb-6" style={{ fontFamily: font, fontSize: size * 1.8, fontWeight: 700 }}>
          {content.establishment_name as string}
        </div>
      )}

      <div className="border-t border-current/20 mb-4" />

      {sections.map((section, i) => (
        <div key={i} className="mb-4">
          <div className="text-center uppercase tracking-wider mb-2 opacity-80" style={{ fontFamily: font, fontSize: size * 0.85 }}>
            {section.name}
          </div>
          {section.items.map((item, j) => (
            <div key={j} className="flex justify-between items-baseline mb-1" style={{ fontFamily: font, fontSize: size }}>
              <span>{item.name}</span>
              <span className="flex-1 border-b border-dotted border-current/20 mx-2" />
              <span>{item.price}</span>
            </div>
          ))}
        </div>
      ))}
    </ParchmentBase>
  )
}
