import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import { searchSpells, fetchAllSpells } from '@/lib/open5e'
import type { Spell } from '@/lib/types'
import type { Open5eSpell } from '@/lib/open5e'

export function useCampaignSpells(campaignId: string) {
  return useQuery({
    queryKey: ['spells', campaignId],
    queryFn: async (): Promise<Spell[]> => {
      const { data, error } = await supabase
        .from('spells')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('level')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useSearchSrdSpells(params: {
  search?: string
  level?: number
  school?: string
  dnd_class?: string
  edition?: string
  includeOtherEdition?: boolean
  enabled?: boolean
}) {
  const { enabled = true, ...searchParams } = params
  return useQuery({
    queryKey: ['srd-spells', searchParams],
    queryFn: () => searchSpells(searchParams),
    enabled: enabled && !!(searchParams.search || searchParams.level !== undefined || searchParams.school || searchParams.dnd_class),
    staleTime: 1000 * 60 * 5,
  })
}

function spellFromSrd(srd: Open5eSpell, campaignId: string) {
  const components: string[] = []
  if (srd.requires_verbal_components) components.push('V')
  if (srd.requires_somatic_components) components.push('S')
  if (srd.requires_material_components) components.push(`M (${srd.material})`)

  return {
    campaign_id: campaignId,
    source: 'srd' as const,
    srd_slug: srd.slug,
    name: srd.name,
    level: srd.level_int,
    school: srd.school,
    casting_time: srd.casting_time,
    range: srd.range,
    duration: srd.duration,
    concentration: srd.concentration === 'yes',
    ritual: srd.ritual === 'yes',
    components: components.join(', '),
    classes: srd.dnd_class.split(', ').map((c) => c.trim()),
    source_book: srd.document__title || null,
    spell_data: srd,
  }
}

export function useSaveSpell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ srdSpell, campaignId }: { srdSpell: Open5eSpell; campaignId: string }) => {
      const spell = spellFromSrd(srdSpell, campaignId)
      const { data, error } = await supabase
        .from('spells')
        .insert(spell)
        .select()
        .single()
      if (error) throw error
      return data as Spell
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spells', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Spell saved to library')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useBulkImportSpells() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      onProgress,
    }: {
      campaignId: string
      onProgress?: (loaded: number, total: number, phase: string) => void
    }) => {
      onProgress?.(0, 0, 'Fetching SRD spells...')
      const allSrd = await fetchAllSpells((loaded, total) => {
        onProgress?.(loaded, total, 'Fetching SRD spells...')
      })

      // Get existing slugs
      const { data: existing } = await supabase
        .from('spells')
        .select('srd_slug')
        .eq('campaign_id', campaignId)
        .not('srd_slug', 'is', null)

      const existingSlugs = new Set((existing ?? []).map((e) => e.srd_slug))
      const newSpells = allSrd.filter((s) => !existingSlugs.has(s.slug))

      // Batch insert in chunks of 50
      let saved = 0
      for (let i = 0; i < newSpells.length; i += 50) {
        const chunk = newSpells.slice(i, i + 50).map((s) => spellFromSrd(s, campaignId))
        const { error } = await supabase.from('spells').insert(chunk)
        if (error) throw error
        saved += chunk.length
        onProgress?.(saved, newSpells.length, 'Saving spells...')
      }

      return { imported: saved, skipped: existingSlugs.size }
    },
    onSuccess: (data, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['spells', campaignId] })
      useToastStore.getState().addToast('success', `Imported ${data.imported} spells`)
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteSpell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('spells').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spells', data.campaignId] })
      useToastStore.getState().addToast('success', 'Spell removed')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
