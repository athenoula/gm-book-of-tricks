import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type { Spell } from '@/lib/types'

interface PCSpell {
  id: string
  pc_id: string
  spell_id: string
  is_prepared: boolean
  created_at: string
  spell: Spell
}

export function usePCSpells(pcId: string) {
  return useQuery({
    queryKey: ['pc-spells', pcId],
    queryFn: async (): Promise<PCSpell[]> => {
      const { data, error } = await supabase
        .from('pc_spells')
        .select('*, spell:spells(*)')
        .eq('pc_id', pcId)
        .order('created_at')
      if (error) throw error
      return data as PCSpell[]
    },
  })
}

export function useAssignSpell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pcId, spellId }: { pcId: string; spellId: string }) => {
      const { error } = await supabase
        .from('pc_spells')
        .insert({ pc_id: pcId, spell_id: spellId })
      if (error) throw error
    },
    onSuccess: (_, { pcId }) => {
      queryClient.invalidateQueries({ queryKey: ['pc-spells', pcId] })
      useToastStore.getState().addToast('success', 'Spell assigned')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUnassignSpell() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, pcId }: { id: string; pcId: string }) => {
      const { error } = await supabase
        .from('pc_spells')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { pcId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pc-spells', data.pcId] })
      useToastStore.getState().addToast('success', 'Spell removed')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useTogglePrepared() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isPrepared, pcId }: { id: string; isPrepared: boolean; pcId: string }) => {
      const { error } = await supabase
        .from('pc_spells')
        .update({ is_prepared: isPrepared })
        .eq('id', id)
      if (error) throw error
      return { pcId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pc-spells', data.pcId] })
    },
  })
}
