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

export function useSearchSrdMonsters(search: string) {
  return useQuery({
    queryKey: ['srd-monsters', search],
    queryFn: () => searchMonsters(search),
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
