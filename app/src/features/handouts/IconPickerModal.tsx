import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ScaleIn } from '@/components/motion'
import * as Icons from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'

interface Props {
  onSelect: (iconName: string) => void
  onClose: () => void
}

const ICON_ENTRIES: { name: string; component: IconComponent }[] = Object.entries(Icons)
  .filter(([key]) => key.startsWith('Gi') && key !== 'GiSun' && key !== 'GiMoonBats')
  .map(([name, component]) => ({ name, component: component as IconComponent }))

export function IconPickerModal({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? ICON_ENTRIES.filter((e) =>
        e.name.replace(/^Gi/, '').replace(/([A-Z])/g, ' $1').toLowerCase().includes(search.toLowerCase())
      )
    : ICON_ENTRIES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <ScaleIn>
        <div
          className="bg-bg-base border border-border rounded-[--radius-lg] w-[480px] max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm text-text-heading font-medium">Choose Seal Icon</h3>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div className="px-4 py-2">
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-8 gap-1">
              {filtered.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => { onSelect(entry.name); onClose() }}
                  className="p-2 rounded-[--radius-sm] hover:bg-bg-raised transition-colors cursor-pointer flex items-center justify-center"
                  title={entry.name.replace(/^Gi/, '').replace(/([A-Z])/g, ' $1').trim()}
                >
                  <entry.component size={24} className="text-text-body mx-auto" />
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center">No icons match "{search}"</p>
            )}
          </div>
        </div>
      </ScaleIn>
    </div>
  )
}
