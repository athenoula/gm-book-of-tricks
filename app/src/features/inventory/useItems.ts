import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type Item = {
  id: string
  campaign_id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'magic_item' | 'equipment' | 'consumable' | 'other'
  rarity: string | null
  cost: string | null
  stackable: boolean
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  item_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function useItems(campaignId: string) {
  return useQuery({
    queryKey: ['items', campaignId],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      description?: string
      type?: Item['type']
      rarity?: string
      cost?: string
      stackable?: boolean
      source?: Item['source']
      srd_slug?: string
      item_data?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('items')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Item
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['items', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Item added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

type Open5eItem = {
  slug: string
  name: string
  desc?: string
  document__slug?: string
  cost?: string
  rarity?: string
  requires_attunement?: string
  [key: string]: unknown
}

type Open5eListResponse = {
  count: number
  next: string | null
  results: Open5eItem[]
}

async function fetchAllFromOpen5e(endpoint: string): Promise<Open5eItem[]> {
  const results: Open5eItem[] = []
  let url: string | null = `https://api.open5e.com/v1/${endpoint}/?limit=100&document__slug=wotc-srd`

  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e fetch failed: ${res.status}`)
    const json = (await res.json()) as Open5eListResponse
    results.push(...json.results)
    url = json.next
  }

  return results
}

function mapOpen5eWeapon(item: Open5eItem, campaignId: string) {
  return {
    campaign_id: campaignId,
    name: item.name,
    description: (item.desc as string) ?? '',
    type: 'weapon' as const,
    rarity: null,
    cost: (item.cost as string) ?? null,
    stackable: false,
    source: 'srd' as const,
    srd_slug: item.slug,
    item_data: item as Record<string, unknown>,
  }
}

function mapOpen5eArmor(item: Open5eItem, campaignId: string) {
  return {
    campaign_id: campaignId,
    name: item.name,
    description: (item.desc as string) ?? '',
    type: 'armor' as const,
    rarity: null,
    cost: (item.cost as string) ?? null,
    stackable: false,
    source: 'srd' as const,
    srd_slug: item.slug,
    item_data: item as Record<string, unknown>,
  }
}

function mapOpen5eMagicItem(item: Open5eItem, campaignId: string) {
  return {
    campaign_id: campaignId,
    name: item.name,
    description: (item.desc as string) ?? '',
    type: 'magic_item' as const,
    rarity: (item.rarity as string) ?? null,
    cost: null,
    stackable: false,
    source: 'srd' as const,
    srd_slug: item.slug,
    item_data: item as Record<string, unknown>,
  }
}

export function useBulkImportItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      onProgress,
    }: {
      campaignId: string
      onProgress?: (loaded: number, total: number, message: string) => void
    }) => {
      // Get existing slugs to avoid duplicates
      const { data: existing } = await supabase
        .from('items')
        .select('srd_slug')
        .eq('campaign_id', campaignId)
        .not('srd_slug', 'is', null)

      const existingSlugs = new Set((existing ?? []).map((e) => e.srd_slug))

      onProgress?.(0, 1, 'Fetching items from Open5e...')

      const [magicItems, weapons, armor] = await Promise.all([
        fetchAllFromOpen5e('magicitems'),
        fetchAllFromOpen5e('weapons'),
        fetchAllFromOpen5e('armor'),
      ])

      const newItems = [
        ...magicItems
          .filter((i) => !existingSlugs.has(i.slug))
          .map((i) => mapOpen5eMagicItem(i, campaignId)),
        ...weapons
          .filter((i) => !existingSlugs.has(i.slug))
          .map((i) => mapOpen5eWeapon(i, campaignId)),
        ...armor
          .filter((i) => !existingSlugs.has(i.slug))
          .map((i) => mapOpen5eArmor(i, campaignId)),
      ]

      let inserted = 0
      for (let i = 0; i < newItems.length; i += 50) {
        const chunk = newItems.slice(i, i + 50)
        const { error } = await supabase.from('items').insert(chunk)
        if (error) throw error
        inserted += chunk.length
        onProgress?.(inserted, newItems.length, 'Importing items...')
      }

      return { imported: inserted }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.campaignId] })
      useToastStore.getState().addToast('success', `Imported ${data.imported} items`)
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Import failed')
    },
  })
}
