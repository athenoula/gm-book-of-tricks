import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface SearchItem {
  id: string
  name: string
  subtitle?: string
}

interface SearchGroup {
  type: string
  icon: string
  items: SearchItem[]
}

export function useCommandPaletteSearch(query: string, campaignId: string | null) {
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery<SearchGroup[]>({
    queryKey: ['command-palette-search', debouncedQuery, campaignId],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`

      const buildQuery = <T extends Record<string, unknown>>(
        table: string,
        select: string,
      ) => {
        let q = supabase.from(table).select(select).ilike('name', pattern).limit(5)
        if (campaignId) {
          q = q.eq('campaign_id', campaignId)
        }
        return q as PromiseLike<{ data: T[] | null; error: unknown }>
      }

      const [spells, monsters, characters, npcs, locations, sessions] = await Promise.all([
        buildQuery<{ id: string; name: string; level: number }>('spells', 'id, name, level'),
        buildQuery<{ id: string; name: string; challenge_rating: string }>('monsters', 'id, name, challenge_rating'),
        buildQuery<{ id: string; name: string; class: string }>('player_characters', 'id, name, class'),
        buildQuery<{ id: string; name: string; occupation: string }>('npcs', 'id, name, occupation'),
        buildQuery<{ id: string; name: string; type: string }>('locations', 'id, name, type'),
        buildQuery<{ id: string; name: string; campaign_id: string }>('sessions', 'id, name, campaign_id'),
      ])

      const groups: SearchGroup[] = []

      if (spells.data?.length) {
        groups.push({
          type: 'Spells',
          icon: 'spell',
          items: spells.data.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: `Level ${s.level}`,
          })),
        })
      }

      if (monsters.data?.length) {
        groups.push({
          type: 'Monsters',
          icon: 'monster',
          items: monsters.data.map((m) => ({
            id: m.id,
            name: m.name,
            subtitle: `CR ${m.challenge_rating}`,
          })),
        })
      }

      if (characters.data?.length) {
        groups.push({
          type: 'Characters',
          icon: 'character',
          items: characters.data.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: c.class,
          })),
        })
      }

      if (npcs.data?.length) {
        groups.push({
          type: 'NPCs',
          icon: 'npc',
          items: npcs.data.map((n) => ({
            id: n.id,
            name: n.name,
            subtitle: n.occupation,
          })),
        })
      }

      if (locations.data?.length) {
        groups.push({
          type: 'Locations',
          icon: 'location',
          items: locations.data.map((l) => ({
            id: l.id,
            name: l.name,
            subtitle: l.type,
          })),
        })
      }

      if (sessions.data?.length) {
        groups.push({
          type: 'Sessions',
          icon: 'session',
          items: sessions.data.map((s) => ({
            id: s.id,
            name: s.name,
          })),
        })
      }

      return groups
    },
  })
}
