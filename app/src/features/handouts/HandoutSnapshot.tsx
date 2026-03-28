import type { Handout } from '@/lib/types'
import { TEMPLATE_CONFIGS } from './templates'

interface Props {
  data: Record<string, unknown>
}

export function HandoutSnapshot({ data }: Props) {
  const template = data.template as Handout['template']
  const config = TEMPLATE_CONFIGS[template]
  const content = data.content as Record<string, unknown>

  return (
    <div className="text-sm space-y-1">
      <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
        {config?.emoji} {config?.label || template}
      </span>
      {content?.title && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.title as string}</p>
      )}
      {content?.body && (
        <p className="text-xs text-text-secondary line-clamp-3">{content.body as string}</p>
      )}
      {content?.establishment_name && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.establishment_name as string}</p>
      )}
      {content?.headline && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.headline as string}</p>
      )}
      {content?.event_title && (
        <p className="text-xs text-text-heading font-medium mt-1">{content.event_title as string}</p>
      )}
    </div>
  )
}
