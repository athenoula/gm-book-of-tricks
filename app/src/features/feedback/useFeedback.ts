import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type {
  FeedbackResponse,
  FeedbackStep1,
  FeedbackStep2,
  FeedbackStep3,
  FeedbackStep4,
} from '@/lib/types'

// Fetch the user's existing feedback response (or null)
export function useFeedbackResponse() {
  return useQuery({
    queryKey: ['feedback-response'],
    queryFn: async (): Promise<FeedbackResponse | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('feedback_responses')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

// Detect which features the user has data in
export function useDetectedFeatures() {
  return useQuery({
    queryKey: ['detected-features'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uid = user.id

      const [
        campaigns,
        sessions,
        characters,
        monsters,
        spells,
        locations,
        inspiration,
      ] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('gm_id', uid),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('player_characters').select('id', { count: 'exact', head: true }),
        supabase.from('monsters').select('id', { count: 'exact', head: true }),
        supabase.from('spells').select('id', { count: 'exact', head: true }).eq('source', 'homebrew'),
        supabase.from('locations').select('id', { count: 'exact', head: true }),
        supabase.from('inspiration_items').select('id', { count: 'exact', head: true }),
      ])

      const features: { name: string; count: number }[] = []

      if (campaigns.count && campaigns.count > 0) features.push({ name: 'Campaigns', count: campaigns.count })
      if (sessions.count && sessions.count > 0) features.push({ name: 'Sessions', count: sessions.count })
      if (characters.count && characters.count > 0) features.push({ name: 'Characters', count: characters.count })
      if (monsters.count && monsters.count > 0) features.push({ name: 'Bestiary', count: monsters.count })
      if (spells.count && spells.count > 0) features.push({ name: 'Spellbook', count: spells.count })
      if (locations.count && locations.count > 0) features.push({ name: 'Locations', count: locations.count })
      if (inspiration.count && inspiration.count > 0) features.push({ name: 'Inspiration Board', count: inspiration.count })

      return features
    },
  })
}

// Save a single step (upsert)
export function useSaveFeedbackStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      step,
      data,
      currentStep,
    }: {
      step: 'step1' | 'step2' | 'step3' | 'step4'
      data: FeedbackStep1 | FeedbackStep2 | FeedbackStep3 | FeedbackStep4
      currentStep: number
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feedback_responses')
        .upsert(
          {
            user_id: user.id,
            [step]: data,
            current_step: currentStep,
          },
          { onConflict: 'user_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-response'] })
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to save')
    },
  })
}

// Mark feedback as completed
export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      step4,
    }: {
      step4: FeedbackStep4
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feedback_responses')
        .upsert(
          {
            user_id: user.id,
            step4,
            current_step: 4,
            completed: true,
          },
          { onConflict: 'user_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-response'] })
      useToastStore.getState().addToast('success', 'Thank you for your feedback!')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to submit')
    },
  })
}
