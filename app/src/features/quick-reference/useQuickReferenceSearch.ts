import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SearchItem {
  id: string
  name: string
  subtitle: string
}

export interface SearchGroup {
  type: 'spell' | 'monster' | 'ability' | 'pc' | 'npc' | 'location'
  label: string
  icon: string
  items: SearchItem[]
}

export function useQuickReferenceSearch(query: string, campaignId: string | null) {
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery<SearchGroup[]>({
    queryKey: ['quick-reference-search', debouncedQuery, campaignId],
    enabled: debouncedQuery.length >= 2 && !!campaignId,
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`

      const [spells, monsters, abilities, characters, npcs, locations] = await Promise.all([
        supabase
          .from('spells')
          .select('id, name, level, school')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('monsters')
          .select('id, name, challenge_rating, size, type')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('abilities')
          .select('id, name, usage_type, ability_data')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('player_characters')
          .select('id, name, race, class, level')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('npcs')
          .select('id, name, occupation')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('locations')
          .select('id, name, type')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
      ])

      const groups: SearchGroup[] = []

      if (spells.data?.length) {
        groups.push({
          type: 'spell',
          label: 'Spells',
          icon: 'spell',
          items: spells.data.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: `Level ${s.level} · ${s.school || ''}`,
          })),
        })
      }

      if (monsters.data?.length) {
        groups.push({
          type: 'monster',
          label: 'Monsters',
          icon: 'monster',
          items: monsters.data.map((m) => ({
            id: m.id,
            name: m.name,
            subtitle: `CR ${m.challenge_rating} · ${m.size || ''} ${m.type || ''}`,
          })),
        })
      }

      if (abilities.data?.length) {
        const usageLabels: Record<string, string> = {
          action: 'Action',
          bonus_action: 'Bonus Action',
          reaction: 'Reaction',
          passive: 'Passive',
          other: '',
        }
        groups.push({
          type: 'ability',
          label: 'Abilities',
          icon: 'ability',
          items: abilities.data.map((a) => {
            const featureClass = (a.ability_data as Record<string, unknown>)?.feature_class as string | undefined
            const parts = [usageLabels[a.usage_type] || '', featureClass || ''].filter(Boolean)
            return {
              id: a.id,
              name: a.name,
              subtitle: parts.join(' · '),
            }
          }),
        })
      }

      if (characters.data?.length) {
        groups.push({
          type: 'pc',
          label: 'Characters',
          icon: 'character',
          items: characters.data.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: `${c.race || ''} ${c.class || ''} · Level ${c.level || '?'}`,
          })),
        })
      }

      if (npcs.data?.length) {
        groups.push({
          type: 'npc',
          label: 'NPCs',
          icon: 'npc',
          items: npcs.data.map((n) => ({
            id: n.id,
            name: n.name,
            subtitle: n.occupation || '',
          })),
        })
      }

      if (locations.data?.length) {
        groups.push({
          type: 'location',
          label: 'Locations',
          icon: 'location',
          items: locations.data.map((l) => ({
            id: l.id,
            name: l.name,
            subtitle: l.type || '',
          })),
        })
      }

      return groups
    },
  })
}

// Fetch full details for a selected item
export function useQuickReferenceDetail(
  type: SearchGroup['type'] | null,
  id: string | null,
) {
  const table: Record<string, string> = {
    spell: 'spells',
    monster: 'monsters',
    ability: 'abilities',
    pc: 'player_characters',
    npc: 'npcs',
    location: 'locations',
  }

  return useQuery({
    queryKey: ['quick-reference-detail', type, id],
    enabled: !!type && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table[type!])
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return { type: type!, data }
    },
  })
}
