import { supabase } from '@/lib/supabase'
import type { Campaign, Session, PlayerCharacter, NPC, Monster, Spell, Handout } from '@/lib/types'

// =============================================
// Shared inline types (used across export modules)
// =============================================

export type TimelineBlock = {
  id: string
  session_id: string
  campaign_id: string
  block_type: 'scene' | 'note' | 'monster' | 'npc' | 'spell' | 'location' | 'battle' | 'handout'
  source_id: string | null
  title: string
  content_snapshot: Record<string, unknown>
  sort_order: number
  is_collapsed: boolean
  created_at: string
  updated_at: string
}

export type Location = {
  id: string
  campaign_id: string
  name: string
  description: string | null
  type: string | null
  parent_location_id: string | null
  map_url: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

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

export type Battle = {
  id: string
  campaign_id: string
  session_id: string | null
  name: string
  type: 'template' | 'save_state'
  round: number
  active_index: number
  in_combat: boolean
  combatant_data: {
    name: string
    hp_max: number
    armor_class: number
    initiative: number
    is_player: boolean
  }[]
  notes: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Junction table result types
// =============================================

export type PCSpellRow = {
  pc_id: string
  spell: { name: string } | null
}

export type NPCSpellRow = {
  npc_id: string
  spell: { name: string } | null
}

export type CharacterInventoryRow = {
  character_id: string
  item: { name: string } | null
  quantity: number
  equipped: boolean
}

// =============================================
// Resolved timeline content type
// =============================================

export type ResolvedTimelineContent = {
  monsters: Monster[]
  npcs: NPC[]
  spells: Spell[]
  locations: Location[]
}

// =============================================
// Individual fetcher functions
// =============================================

export async function fetchCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Campaign not found')
  return data as unknown as Campaign
}

export async function fetchSessions(campaignId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('session_number', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Session[]
}

export async function fetchSessionById(sessionId: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Session not found')
  return data as unknown as Session
}

export async function fetchTimelineBlocks(sessionIds: string[]): Promise<TimelineBlock[]> {
  if (sessionIds.length === 0) return []

  const { data, error } = await supabase
    .from('timeline_blocks')
    .select('*')
    .in('session_id', sessionIds)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Error fetching timeline_blocks: ${error.message}`)
  return (data ?? []) as unknown as TimelineBlock[]
}

export async function fetchPCs(campaignId: string): Promise<PlayerCharacter[]> {
  const { data, error } = await supabase
    .from('player_characters')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching player_characters: ${error.message}`)
  return (data ?? []) as unknown as PlayerCharacter[]
}

export async function fetchNPCs(campaignId: string): Promise<NPC[]> {
  const { data, error } = await supabase
    .from('npcs')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching npcs: ${error.message}`)
  return (data ?? []) as unknown as NPC[]
}

export async function fetchMonsters(campaignId: string): Promise<Monster[]> {
  const { data, error } = await supabase
    .from('monsters')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching monsters: ${error.message}`)
  return (data ?? []) as unknown as Monster[]
}

export async function fetchSpells(campaignId: string): Promise<Spell[]> {
  const { data, error } = await supabase
    .from('spells')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching spells: ${error.message}`)
  return (data ?? []) as unknown as Spell[]
}

export async function fetchItems(campaignId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching items: ${error.message}`)
  return (data ?? []) as unknown as Item[]
}

export async function fetchLocations(campaignId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching locations: ${error.message}`)
  return (data ?? []) as unknown as Location[]
}

export async function fetchHandouts(campaignId: string): Promise<Handout[]> {
  const { data, error } = await supabase
    .from('handouts')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching handouts: ${error.message}`)
  return (data ?? []) as unknown as Handout[]
}

export async function fetchBattles(campaignId: string): Promise<Battle[]> {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('campaign_id', campaignId)

  if (error) throw new Error(`Error fetching battles: ${error.message}`)
  return (data ?? []) as unknown as Battle[]
}

export async function fetchPCSpells(pcIds: string[]): Promise<PCSpellRow[]> {
  if (pcIds.length === 0) return []

  const { data, error } = await supabase
    .from('pc_spells')
    .select('*, spell:spells(name)')
    .in('pc_id', pcIds)

  if (error) throw new Error(`Error fetching pc_spells: ${error.message}`)
  return (data ?? []) as unknown as PCSpellRow[]
}

export async function fetchNPCSpells(npcIds: string[]): Promise<NPCSpellRow[]> {
  if (npcIds.length === 0) return []

  const { data, error } = await supabase
    .from('npc_spells')
    .select('*, spell:spells(name)')
    .in('npc_id', npcIds)

  if (error) throw new Error(`Error fetching npc_spells: ${error.message}`)
  return (data ?? []) as unknown as NPCSpellRow[]
}

export async function fetchCharacterInventory(pcIds: string[]): Promise<CharacterInventoryRow[]> {
  if (pcIds.length === 0) return []

  const { data, error } = await supabase
    .from('character_inventory')
    .select('*, item:items(name)')
    .in('character_id', pcIds)

  if (error) throw new Error(`Error fetching character_inventory: ${error.message}`)
  return (data ?? []) as unknown as CharacterInventoryRow[]
}

/**
 * Resolves source_ids in timeline blocks to full records.
 * Looks up monsters, NPCs, spells, and locations referenced by blocks.
 */
export async function fetchResolvedTimelineContent(
  blocks: TimelineBlock[],
): Promise<ResolvedTimelineContent> {
  const monsterIds = blocks
    .filter(b => b.block_type === 'monster' && b.source_id)
    .map(b => b.source_id!)

  const npcIds = blocks
    .filter(b => b.block_type === 'npc' && b.source_id)
    .map(b => b.source_id!)

  const spellIds = blocks
    .filter(b => b.block_type === 'spell' && b.source_id)
    .map(b => b.source_id!)

  const locationIds = blocks
    .filter(b => b.block_type === 'location' && b.source_id)
    .map(b => b.source_id!)

  const [monstersResult, npcsResult, spellsResult, locationsResult] = await Promise.all([
    monsterIds.length > 0
      ? supabase.from('monsters').select('*').in('id', monsterIds)
      : Promise.resolve({ data: [], error: null }),
    npcIds.length > 0
      ? supabase.from('npcs').select('*').in('id', npcIds)
      : Promise.resolve({ data: [], error: null }),
    spellIds.length > 0
      ? supabase.from('spells').select('*').in('id', spellIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length > 0
      ? supabase.from('locations').select('*').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  for (const [result, name] of [
    [monstersResult, 'monsters'],
    [npcsResult, 'npcs'],
    [spellsResult, 'spells'],
    [locationsResult, 'locations'],
  ] as Array<[{ error: { message: string } | null }, string]>) {
    if (result.error) throw new Error(`Error resolving timeline ${name}: ${result.error.message}`)
  }

  return {
    monsters: (monstersResult.data ?? []) as unknown as Monster[],
    npcs: (npcsResult.data ?? []) as unknown as NPC[],
    spells: (spellsResult.data ?? []) as unknown as Spell[],
    locations: (locationsResult.data ?? []) as unknown as Location[],
  }
}

/**
 * Returns the recap text for a session export.
 * Uses the session's own recap if set, otherwise fetches the previous
 * session's recap (i.e. the "last time on..." summary).
 */
export async function fetchRecapForSession(session: Session): Promise<string | null> {
  if (session.recap) return session.recap

  // Fetch the previous session by session_number
  if (session.session_number == null || session.session_number <= 1) return null

  const { data, error } = await supabase
    .from('sessions')
    .select('recap')
    .eq('campaign_id', session.campaign_id)
    .eq('session_number', session.session_number - 1)
    .single()

  if (error || !data) return null
  return (data as { recap: string | null }).recap
}
