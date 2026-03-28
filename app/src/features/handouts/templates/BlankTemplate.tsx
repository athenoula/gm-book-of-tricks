import { ParchmentBase } from './ParchmentBase'
import type { Handout } from '@/lib/types'

interface Props {
  content: Record<string, unknown>
  style: Handout['style']
}

export function BlankTemplate({ content, style }: Props) {
  const font = style.font_family || "'Caveat', cursive"
  const size = style.font_size || 16

  return (
    <ParchmentBase template="blank">
      {content.body && (
        <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {content.body as string}
        </div>
      )}
    </ParchmentBase>
  )
}
