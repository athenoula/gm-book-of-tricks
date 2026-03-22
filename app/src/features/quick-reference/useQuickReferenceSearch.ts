import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { searchSpells, searchMonsters } from '@/lib/open5e'

export interface SearchItem {
  id: string
  name: string
  subtitle: string
  source?: 'campaign' | 'srd'
  srdData?: Record<string, unknown>
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

      // Search campaign data AND Open5e SRD in parallel
      const [spells, monsters, abilities, characters, npcs, locations, srdSpells, srdMonsters] = await Promise.all([
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
        // Open5e SRD searches
        searchSpells({ search: debouncedQuery, limit: 5 }).catch(() => ({ results: [] as { slug: string; name: string; level_int: number; school: string }[] })),
        searchMonsters({ search: debouncedQuery }).catch(() => ({ results: [] as { slug: string; name: string; challenge_rating: string; size: string; type: string }[] })),
      ])

      const groups: SearchGroup[] = []

      // Campaign spells
      const campaignSpellNames = new Set((spells.data ?? []).map((s) => s.name.toLowerCase()))
      if (spells.data?.length) {
        groups.push({
          type: 'spell',
          label: 'Spells',
          icon: 'spell',
          items: spells.data.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: `Level ${s.level} · ${s.school || ''}`,
            source: 'campaign' as const,
          })),
        })
      }

      // Campaign monsters
      const campaignMonsterNames = new Set((monsters.data ?? []).map((m) => m.name.toLowerCase()))
      if (monsters.data?.length) {
        groups.push({
          type: 'monster',
          label: 'Monsters',
          icon: 'monster',
          items: monsters.data.map((m) => ({
            id: m.id,
            name: m.name,
            subtitle: `CR ${m.challenge_rating} · ${m.size || ''} ${m.type || ''}`,
            source: 'campaign' as const,
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
              source: 'campaign' as const,
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
            source: 'campaign' as const,
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
            source: 'campaign' as const,
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
            source: 'campaign' as const,
          })),
        })
      }

      // SRD Spells (exclude ones already in campaign)
      const srdSpellItems = (srdSpells.results || [])
        .filter((s) => !campaignSpellNames.has(s.name.toLowerCase()))
        .slice(0, 5)
      if (srdSpellItems.length) {
        groups.push({
          type: 'spell',
          label: 'SRD Spells',
          icon: 'spell',
          items: srdSpellItems.map((s) => ({
            id: `srd:${s.slug}`,
            name: s.name,
            subtitle: `Level ${s.level_int} · ${s.school || ''} · SRD`,
            source: 'srd' as const,
            srdData: s as unknown as Record<string, unknown>,
          })),
        })
      }

      // SRD Monsters (exclude ones already in campaign)
      const srdMonsterItems = (srdMonsters.results || [])
        .filter((m) => !campaignMonsterNames.has(m.name.toLowerCase()))
        .slice(0, 5)
      if (srdMonsterItems.length) {
        groups.push({
          type: 'monster',
          label: 'SRD Monsters',
          icon: 'monster',
          items: srdMonsterItems.map((m) => ({
            id: `srd:${m.slug}`,
            name: m.name,
            subtitle: `CR ${m.challenge_rating} · ${m.size || ''} ${m.type || ''} · SRD`,
            source: 'srd' as const,
            srdData: m as unknown as Record<string, unknown>,
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
  srdData?: Record<string, unknown> | null,
) {
  const table: Record<string, string> = {
    spell: 'spells',
    monster: 'monsters',
    ability: 'abilities',
    pc: 'player_characters',
    npc: 'npcs',
    location: 'locations',
  }

  const isSrd = id?.startsWith('srd:')

  return useQuery({
    queryKey: ['quick-reference-detail', type, id],
    enabled: !!type && !!id,
    queryFn: async () => {
      // For SRD items, fetch full details from Open5e
      if (isSrd && type === 'spell') {
        const slug = id!.replace('srd:', '')
        const res = await fetch(`https://api.open5e.com/v1/spells/${slug}/?format=json`)
        if (!res.ok) throw new Error('Failed to fetch spell from SRD')
        const data = await res.json()
        // Shape it like a campaign spell for the detail renderer
        return {
          type: type!,
          data: {
            id: id!,
            name: data.name,
            level: data.level_int,
            school: data.school,
            components: [
              data.requires_verbal_components && 'V',
              data.requires_somatic_components && 'S',
              data.requires_material_components && `M (${data.material})`,
            ].filter(Boolean).join(', '),
            description: data.desc,
            source: 'srd',
            spell_data: data,
          },
        }
      }

      if (isSrd && type === 'monster') {
        const slug = id!.replace('srd:', '')
        const res = await fetch(`https://api.open5e.com/v1/monsters/${slug}/?format=json`)
        if (!res.ok) throw new Error('Failed to fetch monster from SRD')
        const data = await res.json()
        return {
          type: type!,
          data: {
            id: id!,
            name: data.name,
            size: data.size,
            type: data.type,
            challenge_rating: data.challenge_rating,
            armor_class: data.armor_class,
            hit_points: data.hit_points,
            hit_dice: data.hit_dice,
            source: 'srd',
            stat_block: data,
          },
        }
      }

      // Campaign items — fetch from Supabase
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
