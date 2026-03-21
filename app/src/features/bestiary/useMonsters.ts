import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import { searchMonsters } from '@/lib/open5e'
import type { Monster } from '@/lib/types'
import type { Open5eMonster } from '@/lib/open5e'

export function useCampaignMonsters(campaignId: string) {
  return useQuery({
    queryKey: ['monsters', campaignId],
    queryFn: async (): Promise<Monster[]> => {
      const { data, error } = await supabase
        .from('monsters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useSearchSrdMonsters(params: {
  search: string
  edition?: string
  includeOtherEdition?: boolean
}) {
  const { search, edition, includeOtherEdition } = params
  return useQuery({
    queryKey: ['srd-monsters', search, edition, includeOtherEdition],
    queryFn: () => searchMonsters({ search, edition, includeOtherEdition }),
    enabled: search.length >= 2,
    staleTime: 1000 * 60 * 5,
  })
}

export function useSaveMonster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ srdMonster, campaignId }: { srdMonster: Open5eMonster; campaignId: string }) => {
      const { data, error } = await supabase
        .from('monsters')
        .insert({
          campaign_id: campaignId,
          source: 'srd',
          srd_slug: srdMonster.slug,
          name: srdMonster.name,
          size: srdMonster.size,
          type: srdMonster.type,
          alignment: srdMonster.alignment,
          challenge_rating: srdMonster.challenge_rating,
          armor_class: srdMonster.armor_class,
          armor_desc: srdMonster.armor_desc,
          hit_points: srdMonster.hit_points,
          hit_dice: srdMonster.hit_dice,
          speed: srdMonster.speed,
          source_book: srdMonster.document__title || null,
          stat_block: srdMonster,
        })
        .select()
        .single()
      if (error) throw error
      return data as Monster
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monsters', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Monster saved to bestiary')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useCreateMonster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaignId: string
      name: string
      size: string
      type: string
      alignment: string
      challenge_rating: string
      armor_class: number
      hit_points: number
      hit_dice: string
      speed: Record<string, string>
      stat_block: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('monsters')
        .insert({
          campaign_id: input.campaignId,
          source: 'homebrew',
          srd_slug: null,
          source_book: 'Homebrew',
          name: input.name,
          size: input.size,
          type: input.type,
          alignment: input.alignment,
          challenge_rating: input.challenge_rating,
          armor_class: input.armor_class,
          hit_points: input.hit_points,
          hit_dice: input.hit_dice,
          speed: input.speed,
          stat_block: input.stat_block,
        })
        .select()
        .single()
      if (error) throw error
      return data as Monster
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monsters', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Monster created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateMonster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      campaignId: string
      name: string
      size: string
      type: string
      alignment: string
      challenge_rating: string
      armor_class: number
      hit_points: number
      hit_dice: string
      speed: Record<string, string>
      stat_block: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('monsters')
        .update({
          name: input.name,
          size: input.size,
          type: input.type,
          alignment: input.alignment,
          challenge_rating: input.challenge_rating,
          armor_class: input.armor_class,
          hit_points: input.hit_points,
          hit_dice: input.hit_dice,
          speed: input.speed,
          stat_block: input.stat_block,
        })
        .eq('id', input.id)
        .eq('source', 'homebrew')
        .select()
        .single()
      if (error) throw error
      return data as Monster
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monsters', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Monster updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useMonsterToNPC() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      race: string | null
      personality: string | null
      notes: string | null
      stat_block: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('npcs')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaign_id] })
      useToastStore.getState().addToast('success', `${data.name} added as NPC`)
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to create NPC')
    },
  })
}

export function useDeleteMonster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('monsters').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monsters', data.campaignId] })
      useToastStore.getState().addToast('success', 'Monster removed')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
