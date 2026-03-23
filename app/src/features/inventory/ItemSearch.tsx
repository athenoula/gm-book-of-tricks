import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, ScaleIn } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiMagnifyingGlass, GiBackpack, GiGems } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import { searchMagicItems } from '@/lib/open5e'
import { useCreateItem, type Item } from './useItems'

interface SearchResultItem {
  id: string
  name: string
  subtitle: string
  source: 'campaign' | 'srd'
  srdSlug?: string
  srdData?: Record<string, unknown>
}

interface SearchGroup {
  label: string
  icon: 'campaign' | 'srd'
  items: SearchResultItem[]
}

function useItemSearch(query: string, campaignId: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery<SearchGroup[]>({
    queryKey: ['item-search', debouncedQuery, campaignId],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`

      const [campaignItems, srdItems] = await Promise.all([
        supabase
          .from('items')
          .select('id, name, type, rarity, cost, source, srd_slug')
          .eq('campaign_id', campaignId)
          .ilike('name', pattern)
          .limit(8),
        searchMagicItems({ search: debouncedQuery, limit: 8 }).catch(() => ({
          results: [] as { slug: string; name: string; rarity: string; type: string }[],
        })),
      ])

      const groups: SearchGroup[] = []
      const campaignItemNames = new Set((campaignItems.data ?? []).map((i) => i.name.toLowerCase()))

      if (campaignItems.data?.length) {
        groups.push({
          label: 'Campaign Items',
          icon: 'campaign',
          items: campaignItems.data.map((i) => ({
            id: i.id,
            name: i.name,
            subtitle: [i.rarity, i.type?.replace('_', ' '), i.cost].filter(Boolean).join(' · '),
            source: 'campaign' as const,
          })),
        })
      }

      const srdFiltered = (srdItems.results || []).filter(
        (i) => !campaignItemNames.has(i.name.toLowerCase()),
      )
      if (srdFiltered.length) {
        groups.push({
          label: 'SRD Magic Items',
          icon: 'srd',
          items: srdFiltered.map((i) => ({
            id: `srd:${i.slug}`,
            name: i.name,
            subtitle: [i.rarity, i.type, 'SRD'].filter(Boolean).join(' · '),
            source: 'srd' as const,
            srdSlug: i.slug,
            srdData: i as unknown as Record<string, unknown>,
          })),
        })
      }

      return groups
    },
  })
}

interface ItemSearchProps {
  campaignId: string
  onSelect: (item: Item) => void
  onClose: () => void
}

export function ItemSearch({ campaignId, onSelect, onClose }: ItemSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const createItem = useCreateItem()

  const { data: groups } = useItemSearch(query, campaignId)

  const flatItems =
    groups?.flatMap((g) => g.items.map((item) => ({ ...item, groupLabel: g.label }))) ?? []

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleSelect = useCallback(
    async (result: SearchResultItem) => {
      if (result.source === 'campaign') {
        // Fetch full item from Supabase
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', result.id)
          .single()
        if (error) return
        onSelect(data as Item)
        return
      }

      // SRD item — import it first, then select
      if (!result.srdSlug || !result.srdData) return

      createItem.mutate(
        {
          campaign_id: campaignId,
          name: result.name,
          description: (result.srdData.desc as string) ?? '',
          type: 'magic_item',
          rarity: (result.srdData.rarity as string) ?? undefined,
          source: 'srd',
          srd_slug: result.srdSlug,
          item_data: result.srdData,
        },
        {
          onSuccess: (item) => {
            onSelect(item)
          },
        },
      )
    },
    [campaignId, createItem, onSelect],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1 < flatItems.length ? i + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 >= 0 ? i - 1 : flatItems.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[selectedIndex]
        if (item) handleSelect(item)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [flatItems, selectedIndex, handleSelect, onClose],
  )

  const isImporting = createItem.isPending

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        />

        <ScaleIn className="relative w-full max-w-md">
          <div className="bg-bg-base rounded-xl border border-border shadow-lg overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <span className="text-text-muted shrink-0">
                <GameIcon icon={GiMagnifyingGlass} size="lg" />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items or SRD magic items..."
                className="flex-1 bg-transparent text-base text-text-heading placeholder:text-text-muted outline-none"
                disabled={isImporting}
              />
              <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[55vh] overflow-y-auto">
              {isImporting ? (
                <div className="px-4 py-6 text-center text-text-muted text-sm">
                  Importing item...
                </div>
              ) : query.length < 2 ? (
                <div className="px-4 py-6 text-center text-text-muted text-sm">
                  Type to search items...
                </div>
              ) : !groups?.length ? (
                <div className="px-4 py-6 text-center text-text-muted text-sm">No items found</div>
              ) : (
                <div className="py-1">
                  {groups.map((group) => {
                    const groupIcon = group.icon === 'srd' ? GiGems : GiBackpack
                    const groupStartIndex = flatItems.findIndex(
                      (fi) => fi.groupLabel === group.label && fi.id === group.items[0]?.id,
                    )

                    return (
                      <div key={group.label}>
                        {/* Group header */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">
                          <GameIcon icon={groupIcon} size="xs" />
                          {group.label}
                        </div>

                        {group.items.map((item, i) => {
                          const flatIndex = groupStartIndex + i
                          const isSelected = flatIndex === selectedIndex

                          return (
                            <button
                              key={item.id}
                              className={`w-full text-left px-3 py-2 cursor-pointer transition-colors border-l-2 ${
                                isSelected
                                  ? 'bg-primary-ghost border-primary'
                                  : 'border-transparent hover:bg-bg-raised'
                              }`}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(flatIndex)}
                            >
                              <div className="text-sm text-text-heading font-medium">{item.name}</div>
                              {item.subtitle && (
                                <div className="text-[11px] text-text-muted capitalize">
                                  {item.subtitle}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-xs text-text-muted">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
              {groups?.some((g) => g.icon === 'srd') && (
                <span className="ml-auto text-[10px] opacity-60">SRD items auto-imported</span>
              )}
            </div>
          </div>
        </ScaleIn>
      </div>
    </AnimatePresence>
  )
}
