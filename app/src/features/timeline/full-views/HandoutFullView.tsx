import { HandoutPreview } from '@/features/handouts/HandoutPreview'
import type { Handout } from '@/lib/types'

export function HandoutFullView({ data }: { data: Record<string, unknown> }) {
  const template = data.template as Handout['template']
  const content = (data.content ?? {}) as Record<string, unknown>
  const style = (data.style ?? {}) as Handout['style']
  const seal = (data.seal ?? null) as Handout['seal']
  const imageUrl = (data.image_url as string) ?? null

  return (
    <div className="flex justify-center py-2">
      <HandoutPreview
        template={template}
        content={content}
        style={style}
        seal={seal}
        imageUrl={imageUrl}
      />
    </div>
  )
}
